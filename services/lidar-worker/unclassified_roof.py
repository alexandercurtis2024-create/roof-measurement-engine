"""Roof estimate when a tile has elevation but no building class.

Class 6 remains the measured path. This path is used only after that path
refuses. Area is occupied 1 m cells on planar non-ground points, not a
convex hull and not a reference measurement.
"""
from __future__ import annotations
import math
import numpy as np
from scipy.spatial import cKDTree
from engine_frozen import VERSION
from reconstruct import fit_plane

def _grid_sqft(pts, normal, cell=1.0):
    ij = np.floor(pts[:, :2] / cell).astype(int)
    cells = len({(int(i), int(j)) for i, j in ij})
    return cells * cell * cell / max(abs(float(normal[2])), 0.35) * 10.7639

def estimate_unclassified(xyz, cls, dataset_id, label):
    ground = xyz[cls == 2]
    if len(ground) < 20 or len(xyz) < 40:
        return None
    base = float(np.median(ground[:, 2]))
    hag = xyz[:, 2] - base
    cand = xyz[(cls != 2) & (~np.isin(cls, [7, 9, 18])) & (hag >= 1.5) & (hag <= 14)]
    if len(cand) < 40:
        return None
    tree = cKDTree(cand)
    keep = np.zeros(len(cand), dtype=bool)
    for i, p in enumerate(cand):
        idx = tree.query_ball_point(p, 2.2)
        if len(idx) < 6:
            continue
        pts = cand[idx]
        c = pts.mean(axis=0)
        _, _, vh = np.linalg.svd(pts - c, full_matrices=False)
        n = vh[-1]
        if float(np.median(np.abs((pts - c) @ n))) > 0.18 or abs(n[2]) < 0.5:
            continue
        keep[i] = True
    remaining = cand[keep]
    facets = []
    rng = np.random.default_rng(1)
    for _ in range(8):
        if len(remaining) < 18:
            break
        best, best_n = None, 0
        for _i in range(220):
            sample = remaining[rng.choice(len(remaining), 3, replace=False)]
            nvec = np.cross(sample[1] - sample[0], sample[2] - sample[0])
            norm = np.linalg.norm(nvec)
            if norm < 1e-6:
                continue
            nvec = nvec / norm
            if nvec[2] < 0:
                nvec = -nvec
            if nvec[2] < 0.5:
                continue
            d = -nvec.dot(sample[0])
            inl = np.abs(remaining @ nvec + d) < 0.18
            if int(inl.sum()) > best_n:
                best, best_n = inl, int(inl.sum())
        if best is None or best_n < 18:
            break
        pts = remaining[best]
        kt = cKDTree(pts[:, :2])
        seen = np.zeros(len(pts), dtype=bool)
        best_comp = None
        for i in range(len(pts)):
            if seen[i]:
                continue
            stack, comp = [i], []
            seen[i] = True
            while stack:
                j = stack.pop()
                comp.append(j)
                for k in kt.query_ball_point(pts[j, :2], 2.4):
                    if not seen[k]:
                        seen[k] = True
                        stack.append(k)
            if best_comp is None or len(comp) > len(best_comp):
                best_comp = comp
        pts = pts[best_comp]
        remaining = remaining[~best]
        if len(pts) < 18:
            continue
        nvec, d, rmse = fit_plane(pts)
        if rmse > 0.22:
            continue
        slope = math.degrees(math.acos(max(-1, min(1, abs(nvec[2])))))
        area = _grid_sqft(pts, nvec)
        if area / len(pts) > 80:
            continue
        facets.append({"pitch": 12 * math.tan(math.radians(slope)), "area": area, "n": len(pts), "rmse": rmse})
    if not facets:
        return None
    area = float(sum(f["area"] for f in facets))
    pitch = float(np.average([f["pitch"] for f in facets], weights=[f["n"] for f in facets]))
    return {
        "ok": True,
        "label": label,
        "algorithmVersion": VERSION,
        "dataset": dataset_id,
        "raw_points": int(len(xyz)),
        "roof_points": int(keep.sum()),
        "facet_count": len(facets),
        "total_sloped_sqft": area,
        "squares": area / 100.0,
        "predominant_pitch_rise_slope_ge_18deg": pitch,
        "area_mode": "ESTIMATED",
        "pitch_mode": "ESTIMATED",
        "reason": "unclassified_planar_points",
        "confidence": "review",
    }
