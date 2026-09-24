from __future__ import annotations
import math
from dataclasses import dataclass
import numpy as np
@dataclass
class Plane:
    a: float; b: float; c: float; d: float
    n_points: int; rmse: float; slope_deg: float; pitch_rise: float
    azimuth_deg: float; area_xy_m2: float; area_slope_m2: float
def height_above_ground(xyz, cls):
    ground = xyz[cls == 2]
    if len(ground) < 20:
        return xyz[:, 2] - np.percentile(xyz[:, 2], 5)
    return xyz[:, 2] - np.median(ground[:, 2])
def extract_roof_candidates(xyz, cls, hag_min=2.0, hag_max=18.0):
    hag = height_above_ground(xyz, cls)
    veg = np.isin(cls, [3, 4, 5])
    ground = cls == 2
    noise = np.isin(cls, [7, 18])
    keep = (~ground) & (~veg) & (~noise) & (hag >= hag_min) & (hag <= hag_max)
    return xyz[keep], keep, hag
def fit_plane(pts):
    c = pts.mean(axis=0)
    _, _, vh = np.linalg.svd(pts - c, full_matrices=False)
    n = vh[-1]
    if n[2] < 0: n = -n
    d = -n.dot(c)
    resid = pts @ n + d
    return n, d, float(np.sqrt(np.mean(resid**2)))
def ransac_planes(pts, max_planes=12, iters=400, thresh=0.18, min_points=80):
    remaining = pts.copy()
    planes = []
    rng = np.random.default_rng(0)
    for _ in range(max_planes):
        if len(remaining) < min_points: break
        best_idx = None
        best_count = 0
        for _i in range(iters):
            if len(remaining) < 3: break
            sample = remaining[rng.choice(len(remaining), 3, replace=False)]
            n = np.cross(sample[1] - sample[0], sample[2] - sample[0])
            norm = np.linalg.norm(n)
            if norm < 1e-6: continue
            n = n / norm
            if abs(n[2]) < 0.15: continue
            if n[2] < 0: n = -n
            d = -n.dot(sample[0])
            inliers = np.abs(remaining @ n + d) < thresh
            count = int(inliers.sum())
            if count > best_count:
                best_count = count
                best_idx = inliers
        if best_idx is None or best_count < min_points: break
        inlier_pts = remaining[best_idx]
        n, d, rmse = fit_plane(inlier_pts)
        slope = math.degrees(math.acos(max(-1, min(1, abs(n[2])))))
        planes.append(Plane(float(n[0]), float(n[1]), float(n[2]), float(d), best_count, rmse, slope, 12 * math.tan(math.radians(slope)), math.degrees(math.atan2(n[0], n[1])), 1.0, 1.0))
        remaining = remaining[~best_idx]
    return planes, remaining
