from __future__ import annotations
import math
import numpy as np
from scipy.spatial import cKDTree
from reconstruct import ransac_planes
def connected_xy(pts, gap_m=1.6, min_size=22):
    if len(pts) < min_size:
        return []
    tree = cKDTree(pts[:, :2])
    parent = np.arange(len(pts))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for i, j in tree.query_pairs(r=gap_m):
        a, b = find(i), find(j)
        if a != b:
            parent[b] = a
    buckets = {}
    for i in range(len(pts)):
        buckets.setdefault(find(i), []).append(i)
    return [pts[np.array(idx)] for idx in buckets.values() if len(idx) >= min_size]
def assign_and_leftover(pts, planes, thresh=0.16):
    if not planes:
        return [], pts
    R = np.vstack([np.abs(pts @ np.array([p.a, p.b, p.c]) + p.d) for p in planes])
    best = np.argmin(R, axis=0)
    groups, leftover_mask = [], np.ones(len(pts), dtype=bool)
    for i, p in enumerate(planes):
        mask = (best == i) & (R[i] < thresh)
        groups.append(pts[mask])
        leftover_mask[mask] = False
    return groups, pts[leftover_mask]
def second_pass(leftover, max_planes=10, thresh=0.14, min_points=20, max_slope=55):
    if len(leftover) < min_points:
        return [], leftover
    planes, _ = ransac_planes(leftover, max_planes=max_planes, iters=400, thresh=thresh, min_points=min_points)
    kept = [p for p in planes if math.degrees(math.acos(max(-1, min(1, abs(p.c))))) <= max_slope]
    return assign_and_leftover(leftover, kept, thresh)
def facet_confidence(n_pts, rmse, density, area_m2):
    score = 0.0
    if n_pts >= 80: score += 0.3
    elif n_pts >= 40: score += 0.15
    if rmse < 0.08: score += 0.3
    elif rmse < 0.15: score += 0.15
    if density >= 4: score += 0.2
    if area_m2 >= 6: score += 0.2
    label = "high" if score >= 0.7 else "moderate" if score >= 0.4 else "low"
    return score, label
