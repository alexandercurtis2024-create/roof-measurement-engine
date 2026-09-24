from __future__ import annotations
import math
import numpy as np
from shapely.geometry import Polygon
FT = 3.280839895
def poly_of(f):
    return Polygon(np.array(f["ring_utm"])[:, :2]).buffer(0)
def drain_vec(n):
    g = np.array([0.0, 0.0, -1.0])
    t = g - n * np.dot(g, n)
    t[2] = 0.0
    norm = np.linalg.norm(t)
    if norm < 1e-9:
        return np.array([0.0, 0.0])
    return t[:2] / norm
def plane_intersection(n1, d1, n2, d2):
    n1 = np.asarray(n1, float); n2 = np.asarray(n2, float)
    direction = np.cross(n1, n2)
    ln = np.linalg.norm(direction)
    if ln < 1e-8:
        return None
    direction = direction / ln
    M = np.array([[n1.dot(n1), n1.dot(n2)], [n2.dot(n1), n2.dot(n2)]], float)
    try:
        ab = np.linalg.solve(M, np.array([-float(d1), -float(d2)], float))
    except np.linalg.LinAlgError:
        return None
    return ab[0] * n1 + ab[1] * n2, direction
def classify_shared(n1, n2):
    d1, d2 = drain_vec(n1), drain_vec(n2)
    if np.linalg.norm(d1) < 1e-6 or np.linalg.norm(d2) < 1e-6:
        return "unclassified"
    away = float(np.dot(d1, d2))
    ang = math.degrees(math.acos(float(np.clip(away, -1, 1))))
    steep1 = math.degrees(math.acos(max(-1, min(1, abs(n1[2])))))
    steep2 = math.degrees(math.acos(max(-1, min(1, abs(n2[2])))))
    if away < -0.15: return "ridge"
    if away > 0.15: return "valley"
    if min(steep1, steep2) > 15 and ang > 40: return "hip"
    return "unclassified"
