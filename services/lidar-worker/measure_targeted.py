from __future__ import annotations
import math
import numpy as np
from pyproj import Transformer
from shapely.geometry import Point, Polygon
from scipy.spatial import cKDTree
from ept_crop import crop_ept
from engine_frozen import VERSION
from intersect import perimeter_union
from pipeline import EPT, densify_keep
from reconstruct import extract_roof_candidates, fit_plane, height_above_ground, ransac_planes
from run_v025 import clip_overlaps
from run_v026 import connected_component_mask
from run_v027 import facet_expand
from run_v040 import lifted_shared
from run_v051 import parent_abc
from segment import assign_and_leftover, connected_xy, facet_confidence, second_pass

def _ring(geom):
    if not geom:
        return None
    coords = geom.get("coordinates") or (geom.get("geometry") or {}).get("coordinates")
    if not coords:
        return None
    return coords[0][0] if isinstance(coords[0][0][0], (list, tuple)) else coords[0]

def _to_poly(ring, transformer, buf):
    xy = [transformer.transform(float(p[0]), float(p[1])) for p in ring if len(p) >= 2]
    if len(xy) < 4:
        return None
    p = Polygon(xy)
    if buf:
        p = p.buffer(buf)
    return None if p.is_empty else p

def _mask(xyz, lon, lat, center_xy, target_geom, neighbor_geoms):
    ring = _ring(target_geom)
    if ring is None or center_xy is None:
        return np.ones(len(xyz), dtype=bool)
    t = Transformer.from_crs("EPSG:4326", "EPSG:26918", always_xy=True)
    target = _to_poly(ring, t, 4.0)
    if target is None:
        return np.ones(len(xyz), dtype=bool)
    excl = []
    for g in neighbor_geoms or []:
        rr = _ring(g)
        if not rr:
            continue
        p = _to_poly(rr, t, 0.4)
        if p is not None:
            excl.append(p)
    tlx, tly = t.transform(float(lon), float(lat))
    ox, oy = float(center_xy[0]) - tlx, float(center_xy[1]) - tly
    keep = np.zeros(len(xyz), dtype=bool)
    for i, (x, y) in enumerate(xyz[:, :2]):
        p = Point(x - ox, y - oy)
        if excl and any(e.contains(p) for e in excl):
            continue
        if target.contains(p) or target.distance(p) <= 3.0:
            keep[i] = True
    if keep.sum() < 80:
        return np.ones(len(xyz), dtype=bool)
    return keep

def measure_targeted(lon, lat, label, target_geom=None, neighbor_geoms=None):
    crop = crop_ept(EPT, lon, lat, buffer_m=40, max_depth=12)
    if not crop.get("ok") and "xyz" not in crop:
        return {"ok": False, "error": crop, "label": label}
    xyz, cls = crop["xyz"], crop["classification"]
    keep = _mask(xyz, lon, lat, crop.get("center_xy"), target_geom, neighbor_geoms)
    xyz, cls = xyz[keep], cls[keep]
    hag = height_above_ground(xyz, cls)
    bld = xyz[(cls == 6) & (hag >= 1.8) & (hag <= 16)]
    if len(bld) < 40:
        return {"ok": True, "label": label, "algorithmVersion": VERSION, "mode": "UNAVAILABLE", "reason": "insufficient_building_class_points"}
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
    sloped = sum(f.get("area_plane_sqft", 0) for f in facets)
    steep = [f for f in facets if f.get("slope_deg", 0) >= 18]
    pitch = float(np.average([f["pitch_rise"] for f in steep], weights=[f["n_points"] for f in steep])) if steep else None
    return {
        "ok": True, "label": label, "lon": lon, "lat": lat, "algorithmVersion": VERSION,
        "raw_points": int(len(xyz)), "roof_points": int(len(roof)), "unexplained": int(len(still)),
        "facet_count": len(facets), "total_sloped_sqft": sloped, "squares": sloped / 100.0,
        "predominant_pitch_rise_slope_ge_18deg": pitch,
        "area_mode": "MEASURED" if sloped > 200 else "ESTIMATED",
        "pitch_mode": "MEASURED" if pitch is not None else "UNAVAILABLE",
        "masked": True,
    }
