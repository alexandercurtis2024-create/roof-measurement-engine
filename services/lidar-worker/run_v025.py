from __future__ import annotations
import numpy as np
from shapely.geometry import Polygon
from pipeline import SQFT
def clip_overlaps(facets):
    polys = [Polygon(np.array(f["ring_utm"])[:, :2]).buffer(0) for f in facets]
    order = sorted(range(len(facets)), key=lambda i: polys[i].area, reverse=True)
    used = None
    out = []
    for i in order:
        p = polys[i]
        if used is not None:
            p = p.difference(used)
        p = p.buffer(0)
        if p.is_empty or p.area < 0.4:
            continue
        if p.geom_type == "MultiPolygon":
            p = max(p.geoms, key=lambda g: g.area)
        used = p if used is None else used.union(p)
        f = dict(facets[i])
        frac = p.area / max(polys[i].area, 1e-6)
        f["area_xy_sqft"] = float(p.area * SQFT)
        f["area_plane_sqft"] = float(f.get("area_plane_sqft", 0) * frac)
        zmean = float(np.mean(np.array(f["ring_utm"])[:, 2]))
        f["ring_utm"] = [[float(x), float(y), zmean] for x, y in p.exterior.coords]
        out.append(f)
    for n, f in enumerate(out, 1):
        f["id"] = f"F{n}"
    return out
