from __future__ import annotations
import numpy as np
from edges import classify_shared, poly_of
FT = 3.280839895
def lifted_shared(facets):
    shared, rejected = [], []
    for i in range(len(facets)):
        for j in range(i + 1, len(facets)):
            a, b = facets[i], facets[j]
            pa, pb = poly_of(a), poly_of(b)
            if pa.is_empty or pb.is_empty:
                continue
            if pa.buffer(0.12).intersection(pb.buffer(0.12)).is_empty:
                continue
            raw = pa.buffer(0.08).boundary.intersection(pb.buffer(0.08))
            if raw.is_empty:
                rejected.append({"a": a.get("id"), "b": b.get("id"), "reason": "no_line"})
                continue
            if raw.geom_type == "MultiLineString":
                raw = max(raw.geoms, key=lambda g: g.length)
            if raw.geom_type != "LineString" or raw.length < 0.5:
                rejected.append({"a": a.get("id"), "b": b.get("id"), "reason": "short"})
                continue
            n1 = np.array(a["normal"], float)
            d = a["d"]
            def lift(xy):
                z = -(d + n1[0] * xy[0] + n1[1] * xy[1]) / n1[2] if abs(n1[2]) > 1e-6 else 0
                return np.array([xy[0], xy[1], z])
            c0, c1 = np.array(raw.coords[0]), np.array(raw.coords[-1])
            L3 = float(np.linalg.norm(lift(c1) - lift(c0)))
            kind = classify_shared(n1, np.array(b["normal"], float))
            shared.append({"a": a.get("id"), "b": b.get("id"), "class": kind, "length_ft_3d": L3 * FT, "length_m_3d": L3})
    return shared, rejected
