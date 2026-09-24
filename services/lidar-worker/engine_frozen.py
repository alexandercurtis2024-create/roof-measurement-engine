"""Frozen production candidate v1.0.0-cand. Same gates for every Maryland address."""
from __future__ import annotations
import json, math
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from ept_crop import crop_ept
from intersect import perimeter_union
from pipeline import EPT, densify_keep
from reconstruct import extract_roof_candidates, fit_plane, height_above_ground, ransac_planes
from run_v025 import clip_overlaps
from run_v026 import connected_component_mask
from run_v027 import facet_expand
from run_v040 import lifted_shared
from run_v051 import parent_abc
from segment import assign_and_leftover, connected_xy, facet_confidence, second_pass

VERSION = "v1.0.0-cand"
OUT = Path(__file__).parent

def measure(lon: float, lat: float, label: str, ept: str = EPT) -> dict:
    crop = crop_ept(ept, lon, lat, buffer_m=40, max_depth=12)
    if not crop.get("ok") and "xyz" not in crop:
        return {"ok": False, "error": crop, "label": label}
    xyz, cls = crop["xyz"], crop["classification"]
    hag = height_above_ground(xyz, cls)
    bld = xyz[(cls == 6) & (hag >= 1.8) & (hag <= 16)]
    if len(bld) < 40:
        return {"ok": True, "label": label, "algorithmVersion": VERSION, "mode": "UNAVAILABLE", "reason": "insufficient_building_class_points", "building_class6": int(len(bld)), "raw_points": int(len(xyz))}
    keep_idx = connected_component_mask(bld[:, :2], cell=1.2)
    core = bld[keep_idx]
    cand, _, _ = extract_roof_candidates(xyz, cls, 1.8, 16)
    tree = cKDTree(core[:, :2])
    dist, _ = tree.query(cand[:, :2], k=1)
    roof = densify_keep(cand[dist < 2.0], 1.3, 4)
    if len(roof) < 80:
        return {"ok": True, "label": label, "algorithmVersion": VERSION, "mode": "UNAVAILABLE", "reason": "insufficient_roof_candidates", "roof_points": int(len(roof))}
    planes, _ = ransac_planes(roof, max_planes=22, iters=650, thresh=0.16, min_points=24)
    kept_p = [p for p in planes if math.degrees(math.acos(max(-1, min(1, abs(p.c))))) <= 55]
    groups, leftover = assign_and_leftover(roof, kept_p, 0.16)
    extra, still = second_pass(leftover, max_planes=8, thresh=0.14, min_points=20)
    patches = []
    for g in groups + extra:
        patches.extend(connected_xy(g, gap_m=1.6, min_size=20))
    facets = []
    for pts in patches:
        n, d, rmse = fit_plane(pts)
        slope = math.degrees(math.acos(max(-1, min(1, abs(n[2])))))
        if slope > 55 or rmse > 0.28:
            continue
        fac = facet_expand(pts, n, d)
        if not fac or fac["area_plane_m2"] < 1.8:
            continue
        dens = len(pts) / max(fac["area_plane_m2"], 0.1)
        sc, lab = facet_confidence(len(pts), rmse, dens, fac["area_plane_m2"])
        fac.update(rmse=rmse, normal=[float(n[0]), float(n[1]), float(n[2])], d=float(d), confidence=lab, confidence_score=sc)
        facets.append(fac)
    facets = clip_overlaps(facets)
    for i, f in enumerate(facets, 1):
        f["id"] = f"F{i}"
        if "normal" not in f:
            ring = np.array(f["ring_utm"])
            n, d, _ = fit_plane(ring)
            f["normal"] = [float(n[0]), float(n[1]), float(n[2])]
            f["d"] = float(d)
    shared, _ = lifted_shared(facets)
    peri, plen, holes = perimeter_union(facets)
    sloped = sum(f.get("area_plane_sqft", 0) for f in facets)
    steep = [f for f in facets if f.get("slope_deg", 0) >= 18]
    pitch = float(np.average([f["pitch_rise"] for f in steep], weights=[f["n_points"] for f in steep])) if steep else None
    try:
        _, abc = parent_abc(facets, xyz, cls)
    except Exception:
        abc = None
    def tot(items, cls, key="length_ft_3d"):
        return sum(e.get(key, e.get("length_ft", 0)) for e in items if e["class"] == cls)
    high = sum(1 for f in facets if f.get("confidence") == "high")
    area_mode = "MEASURED" if sloped > 200 and high >= max(1, len(facets) // 3) else "ESTIMATED"
    return {
        "ok": True, "label": label, "lon": lon, "lat": lat, "algorithmVersion": VERSION,
        "raw_points": int(len(xyz)), "roof_points": int(len(roof)), "unexplained": int(len(still)),
        "facet_count": len(facets), "total_sloped_sqft": sloped, "squares": sloped / 100.0,
        "predominant_pitch_rise_slope_ge_18deg": pitch,
        "ridge_ft": tot(shared, "ridge"), "hip_ft": tot(shared, "hip"), "valley_ft": tot(shared, "valley"),
        "eave_ft": tot(peri, "eave", "length_ft"), "rake_ft": tot(peri, "rake", "length_ft"),
        "unclassified_perimeter_ft": tot(peri, "perimeter_unclassified", "length_ft"),
        "exterior_perimeter_m": plen, "interior_holes_m": holes, "perimeter_ABC": abc,
        "area_mode": area_mode, "pitch_mode": "MEASURED" if pitch is not None else "UNAVAILABLE", "edge_mode": "ESTIMATED",
        "facets": [{k: f.get(k) for k in ["id", "n_points", "rmse", "slope_deg", "pitch_rise", "area_plane_sqft", "confidence"]} for f in facets],
    }
