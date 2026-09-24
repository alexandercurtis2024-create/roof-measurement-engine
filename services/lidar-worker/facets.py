from __future__ import annotations
import math
import numpy as np
from scipy.spatial import Delaunay
from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union
def plane_basis(n):
    n = n / np.linalg.norm(n)
    tmp = np.array([1.0, 0.0, 0.0]) if abs(n[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    u = np.cross(n, tmp); u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v, n
def project_xy(pts, origin, u, v):
    d = pts - origin
    return np.column_stack([d @ u, d @ v])
def concave_hull(xy, alpha_k=2.4):
    if len(xy) < 4:
        return None
    xy = np.unique(xy, axis=0)
    if len(xy) < 4:
        return MultiPoint(xy).convex_hull
    try:
        tri = Delaunay(xy)
    except Exception:
        return MultiPoint(xy).convex_hull
    lens = []
    for ia, ib, ic in tri.simplices:
        pa, pb, pc = xy[ia], xy[ib], xy[ic]
        lens += [np.linalg.norm(pa-pb), np.linalg.norm(pb-pc), np.linalg.norm(pc-pa)]
    thresh = float(np.median(lens) * alpha_k + 1e-6)
    keep = []
    for ia, ib, ic in tri.simplices:
        pa, pb, pc = xy[ia], xy[ib], xy[ic]
        if np.linalg.norm(pa-pb) < thresh and np.linalg.norm(pb-pc) < thresh and np.linalg.norm(pc-pa) < thresh:
            keep.append(Polygon([pa, pb, pc]))
    if not keep:
        return MultiPoint(xy).convex_hull
    merged = unary_union(keep)
    if merged.geom_type == "Polygon": return merged.buffer(0)
    if merged.geom_type == "MultiPolygon": return max(merged.geoms, key=lambda g: g.area).buffer(0)
    return MultiPoint(xy).convex_hull
def facet_from_points(pts, n, d):
    origin = pts.mean(axis=0)
    u, v, nn = plane_basis(n)
    xy = project_xy(pts, origin, u, v)
    poly = concave_hull(xy)
    if poly is None or poly.is_empty or poly.area < 0.5:
        return None
    poly = poly.buffer(0.15).buffer(-0.15)
    if poly.is_empty: return None
    if poly.geom_type == "MultiPolygon": poly = max(poly.geoms, key=lambda g: g.area)
    ring = []
    for x, y in list(poly.exterior.coords):
        p = origin + x * u + y * v
        ring.append([float(p[0]), float(p[1]), float(p[2])])
    slope = math.degrees(math.acos(max(-1, min(1, abs(nn[2])))))
    pitch = 12 * math.tan(math.radians(slope))
    area_plane = float(poly.area)
    area_xy = area_plane * abs(nn[2])
    return {"n_points": int(len(pts)), "normal": [float(nn[0]), float(nn[1]), float(nn[2])], "d": float(d), "slope_deg": slope, "pitch_rise": pitch, "area_plane_m2": area_plane, "area_xy_m2": area_xy, "area_plane_sqft": area_plane * 10.76391041671, "area_xy_sqft": area_xy * 10.76391041671, "ring_utm": ring}
