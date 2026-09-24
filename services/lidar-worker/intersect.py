from __future__ import annotations
import numpy as np
from shapely.geometry import Point
from shapely.ops import unary_union
from edges import drain_vec, poly_of
FT = 3.280839895
def perimeter_union(facets):
    union = unary_union([poly_of(f) for f in facets if not poly_of(f).is_empty])
    if union.geom_type == "Polygon":
        rings = [union.exterior]; holes = list(union.interiors)
    elif union.geom_type == "MultiPolygon":
        rings = [g.exterior for g in union.geoms]
        holes = [i for g in union.geoms for i in g.interiors]
    else:
        rings, holes = [], []
    peri = []
    for ring in rings:
        coords = list(ring.coords)
        for p0, p1 in zip(coords, coords[1:]):
            seg_len = float(np.hypot(p1[0] - p0[0], p1[1] - p0[1]))
            if seg_len < 0.4: continue
            mid = ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
            best = min(facets, key=lambda f: poly_of(f).distance(Point(mid)))
            n = np.array(best["normal"], float)
            drain = drain_vec(n)
            t = np.array([p1[0] - p0[0], p1[1] - p0[1]])
            tn = np.linalg.norm(t)
            if tn < 1e-9 or np.linalg.norm(drain) < 1e-9:
                kind = "perimeter_unclassified"
            else:
                aln = abs(np.dot(drain, t / tn))
                kind = "eave" if aln < 0.40 else "rake" if aln > 0.80 else "perimeter_unclassified"
            peri.append({"class": kind, "length_m": seg_len, "length_ft": seg_len * FT, "facet": best.get("id")})
    return peri, float(sum(r.length for r in rings)), float(sum(h.length for h in holes))
