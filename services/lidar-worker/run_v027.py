from __future__ import annotations
import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import Polygon
from facets import facet_from_points, plane_basis, project_xy
from pipeline import SQFT
def facet_expand(pts, n, d):
    fac = facet_from_points(pts, n, d)
    if not fac:
        return None
    origin = pts.mean(0)
    u, v, nn = plane_basis(n)
    xy = project_xy(pts, origin, u, v)
    tree = cKDTree(xy)
    spacing = float(np.median(tree.query(xy, k=2)[0][:, 1]))
    ring = np.array(fac["ring_utm"])[:, :2]
    poly = Polygon(ring).buffer(spacing).buffer(0)
    if poly.is_empty:
        return fac
    if poly.geom_type == "MultiPolygon":
        poly = max(poly.geoms, key=lambda g: g.area)
    fac["area_xy_m2"] = float(poly.area)
    fac["area_xy_sqft"] = float(poly.area * SQFT)
    fac["area_plane_m2"] = float(poly.area / max(abs(nn[2]), 0.05))
    fac["area_plane_sqft"] = fac["area_plane_m2"] * SQFT
    fac["spacing_m"] = spacing
    z = float(np.mean(np.array(fac["ring_utm"])[:, 2]))
    fac["ring_utm"] = [[float(x), float(y), z] for x, y in poly.exterior.coords]
    return fac
