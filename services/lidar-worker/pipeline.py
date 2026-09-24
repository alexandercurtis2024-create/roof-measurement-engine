from __future__ import annotations
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
EPT = "https://noaa-nos-coastal-lidar-pds.s3.amazonaws.com/entwine/geoid18/10311/ept.json"
SQFT = 10.76391041671
OUT = Path(__file__).parent
LON, LAT = -76.489366186815, 39.138663390647
def densify_keep(pts, radius=1.4, min_nb=6):
    if len(pts) < 10:
        return pts
    tree = cKDTree(pts[:, :2])
    counts = tree.query_ball_point(pts[:, :2], r=radius, return_length=True)
    return pts[counts >= min_nb]
