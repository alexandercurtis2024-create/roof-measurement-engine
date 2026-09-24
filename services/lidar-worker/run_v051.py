from __future__ import annotations
import math
from collections import Counter
import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import Point
from shapely.ops import unary_union
from edges import poly_of
FT = 3.280839895
def residual(pt, n, d):
    return abs(float(np.dot(pt, n) + d))
def parent_abc(facets, xyz, cls):
    union = unary_union([poly_of(f) for f in facets])
    rings = [union.exterior] if union.geom_type == "Polygon" else [g.exterior for g in union.geoms]
    tree = cKDTree(xyz[:, :2])
    segs = []
    for ring in rings:
        coords = list(ring.coords)
        for p0, p1 in zip(coords, coords[1:]):
            L = float(np.hypot(p1[0] - p0[0], p1[1] - p0[1]))
            if L < 0.35:
                continue
            mid = np.array([(p0[0] + p1[0]) / 2, (p1[1] + p1[1]) / 2])
            t = np.array([p1[0] - p0[0], p1[1] - p0[1]])
            t /= max(np.linalg.norm(t), 1e-9)
            nxy = np.array([-t[1], t[0]])
            if union.contains(Point(*(mid + nxy * 0.4))):
                nxy = -nxy
            parent = min(facets, key=lambda f: poly_of(f).distance(Point(*mid)))
            n = np.array(parent["normal"], float)
            d = parent["d"]
            probe = mid + nxy * 0.8
            idxs = tree.query_ball_point(probe, r=1.0)
            raw_n = len(idxs)
            ok = 0
            for i in idxs:
                if residual(xyz[i], n, d) < 0.16:
                    ok += 1
            if ok >= 3:
                kind = "A_supported_extension"
            elif raw_n >= 5 and ok <= 1:
                kind = "B_observed_termination"
            else:
                kind = "C_unobserved"
            segs.append({"class": kind, "length_ft": L * FT, "raw_n": raw_n, "plane_ok": ok})
    tot = sum(s["length_ft"] for s in segs) or 1
    summary = {k: {"ft": sum(s["length_ft"] for s in segs if s["class"] == k), "pct": 0} for k in ("A_supported_extension", "B_observed_termination", "C_unobserved")}
    for k in summary:
        summary[k]["pct"] = 100 * summary[k]["ft"] / tot
    return segs, summary
