"""Third-pass perimeter solver. Does not retune engine_frozen.py.

Eaves in the frozen engine stop at the building-class hull. This pass looks
1 m outward for ground-adjacent returns and moves the drip line only where
those returns exist. Rake versus eave is the edge direction against the facet
drainage vector. Lengths stay Estimate unless the support gate passes.
"""
from __future__ import annotations
import numpy as np

FT = 3.280839895

def _unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v

def classify_perimeter(edge_xy, normal):
    edge = _unit(np.asarray(edge_xy[1]) - np.asarray(edge_xy[0]))
    drain = _unit(np.array(normal[:2], float))
    align = abs(float(np.dot(edge[:2], drain)))
    return "rake" if align > 0.7 else "eave"

def extend_to_drip(edge_xy, outward, points, band_m=1.0):
    if points is None or len(points) == 0:
        return edge_xy, "C", 0
    p0, p1 = np.asarray(edge_xy[0], float), np.asarray(edge_xy[1], float)
    outward = _unit(np.asarray(outward[:2], float))
    rel = points[:, :2] - p0
    along = np.dot(rel, _unit(p1 - p0))
    side = np.dot(rel, outward)
    length = np.linalg.norm(p1 - p0)
    keep = (along > -0.3) & (along < length + 0.3) & (side > 0) & (side <= band_m)
    support = int(keep.sum())
    if support < 4:
        return edge_xy, "C", support
    shift = float(np.median(side[keep]))
    moved = [(p0 + outward * shift).tolist(), (p1 + outward * shift).tolist()]
    label = "A" if support >= 8 else "B"
    return moved, label, support

def gate(label, support):
    if label in ("A", "B") and support >= 8:
        return "MEASURED"
    return "ESTIMATED"

def edge_geojson(edges):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "LineString", "coordinates": e["coordinates"]}, "properties": {"class": e["class"], "length_ft": e["length_ft"], "abc": e["abc"], "confidence": e["origin"], "support": e["support"]}} for e in edges]}

def facet_geojson(facets):
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [f["ring"]]}, "properties": {"id": f["id"], "pitch": f.get("pitch"), "area_sqft": f.get("area_sqft")}} for f in facets]}

def solve_perimeter(facets, exterior_edges, nearby_points):
    out = []
    for edge in exterior_edges:
        moved, abc, support = extend_to_drip(edge["xy"], edge.get("outward", [0, 1]), nearby_points)
        kind = classify_perimeter(moved, edge.get("normal", [0, -1, 0.7]))
        length = np.linalg.norm(np.asarray(moved[1]) - np.asarray(moved[0])) * FT
        out.append({"class": kind, "coordinates": moved, "length_ft": round(float(length), 1), "abc": abc, "support": support, "origin": gate(abc, support)})
    return out
