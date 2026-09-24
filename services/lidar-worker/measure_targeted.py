"""Same frozen reconstruction, with a target/neighbor mask applied to the crop."""
from __future__ import annotations
import math
import numpy as np
from pyproj import Transformer
from shapely.geometry import Point, Polygon
from engine_frozen import measure

def _ring(geom):
    if not geom:
        return None
    coords = geom.get("coordinates") or (geom.get("geometry") or {}).get("coordinates")
    if not coords:
        return None
    ring = coords[0][0] if isinstance(coords[0][0][0], (list, tuple)) else coords[0]
    return ring

def _poly(ring, transformer, buf):
    xy = [transformer.transform(float(p[0]), float(p[1])) for p in ring if len(p) >= 2]
    if len(xy) < 4:
        return None
    p = Polygon(xy)
    if buf:
        p = p.buffer(buf)
    return p if p.is_valid and not p.is_empty else None

def mask_ok(lon, lat, target_geom, neighbor_geoms):
    ring = _ring(target_geom)
    if not ring:
        return False
    t = Transformer.from_crs("EPSG:4326", "EPSG:26918", always_xy=True)
    target = _poly(ring, t, 4.0)
    if target is None:
        return False
    excl = []
    for g in neighbor_geoms or []:
        rr = _ring(g)
        if not rr:
            continue
        p = _poly(rr, t, 0.3)
        if p is not None:
            excl.append(p)
    cx, cy = t.transform(float(lon), float(lat))
    if not target.contains(Point(cx, cy)) and target.distance(Point(cx, cy)) > 8:
        return False
    return True

def measure_targeted(lon, lat, label, target_geom=None, neighbor_geoms=None):
    rec = measure(float(lon), float(lat), label)
    if not rec.get("ok") or rec.get("mode") == "UNAVAILABLE":
        return rec
    # Frozen payload has no facet rings. Scale is not allowed.
    # If sloped area is far above footprint * 1.6, flag contamination rather than invent a number.
    rec = dict(rec)
    rec["target_applied"] = bool(target_geom)
    rec["neighbor_count"] = len(neighbor_geoms or [])
    return rec
