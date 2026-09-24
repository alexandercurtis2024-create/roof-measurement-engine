from __future__ import annotations
import json
from pathlib import Path
import laspy
import numpy as np
from pyproj import Transformer
UA = "RoofMeasurementEngine/0.2"
def fetch(url, dest=None):
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        data = res.read()
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    return data
def load_ept(ept_url):
    return json.loads(fetch(ept_url).decode())
def wgs84_to_srs(lon, lat, srs):
    auth = srs.get("authority", "EPSG")
    code = srs.get("horizontal") or "3857"
    t = Transformer.from_crs("EPSG:4326", f"{auth}:{code}", always_xy=True)
    x, y = t.transform(lon, lat)
    return float(x), float(y)
def cube_for_key(bounds, key):
    d, x, y, z = key
    xmin, ymin, zmin, xmax, ymax, zmax = bounds
    span = (xmax - xmin) / (2 ** d)
    return [xmin + x * span, ymin + y * span, zmin + z * span, xmin + (x + 1) * span, ymin + (y + 1) * span, zmin + (z + 1) * span]
def intersects_xy(a, b):
    return not (a[3] < b[0] or a[0] > b[3] or a[4] < b[1] or a[1] > b[4])
def children(key):
    d, x, y, z = key
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                yield (d + 1, x * 2 + dx, y * 2 + dy, z * 2 + dz)
def parse_key(name):
    d, x, y, z = name.split("-")
    return int(d), int(x), int(y), int(z)
def walk_nodes(ept, hierarchy, query, max_depth=8):
    stack = [(0, 0, 0, 0)]
    leaves = []
    while stack:
        key = stack.pop()
        d, x, y, z = key
        name = f"{d}-{x}-{y}-{z}"
        cube = cube_for_key(ept["bounds"], key)
        if not intersects_xy(cube, query):
            continue
        kids = [c for c in children(key) if f"{c[0]}-{c[1]}-{c[2]}-{c[3]}" in hierarchy]
        if d >= max_depth or not kids:
            if name in hierarchy or d == 0:
                leaves.append(key)
            continue
        stack.extend(kids)
    return leaves
def load_hierarchy(base, ept, query=None, pages=80):
    root = json.loads(fetch(base + "ept-hierarchy/0-0-0-0.json").decode())
    flat = dict(root)
    def relevant(name):
        if query is None: return True
        try: return intersects_xy(cube_for_key(ept["bounds"], parse_key(name)), query)
        except Exception: return True
    queued = [k for k, v in root.items() if v == -1 and relevant(k)]
    seen = set()
    while queued and len(seen) < pages:
        name = queued.pop(0)
        if name in seen: continue
        seen.add(name)
        try:
            page = json.loads(fetch(base + f"ept-hierarchy/{name}.json").decode())
        except Exception:
            continue
        flat.update(page)
        queued.extend(k for k, v in page.items() if v == -1 and k not in seen and relevant(k))
    return flat
def read_laz_points(path):
    las = laspy.read(path)
    arr = np.column_stack([las.x, las.y, las.z])
    cls = np.array(las.classification) if hasattr(las, "classification") else np.zeros(len(arr))
    return arr, cls
def crop_ept(ept_url, lon, lat, buffer_m=25, max_depth=12, cache_dir=Path("/tmp/ept-cache")):
    ept = load_ept(ept_url)
    base = ept_url.rsplit("/", 1)[0] + "/"
    x, y = wgs84_to_srs(lon, lat, ept["srs"])
    query = [x - buffer_m, y - buffer_m, -1e9, x + buffer_m, y + buffer_m, 1e9]
    hierarchy = load_hierarchy(base, ept, query=query)
    nodes = sorted(walk_nodes(ept, hierarchy, query, max_depth=max_depth), key=lambda k: -k[0])[:24]
    points, classes, fetched = [], [], []
    for key in nodes:
        d, xi, yi, zi = key
        name = f"{d}-{xi}-{yi}-{zi}"
        laz = (cache_dir / name.replace("/", "_")).with_suffix(".laz")
        url = base + f"ept-data/{name}.laz"
        try:
            if not laz.exists():
                fetch(url, laz)
            arr, cls = read_laz_points(laz)
            mask = (arr[:, 0] >= query[0]) & (arr[:, 0] <= query[3]) & (arr[:, 1] >= query[1]) & (arr[:, 1] <= query[4])
            if mask.any():
                points.append(arr[mask]); classes.append(cls[mask])
            fetched.append({"node": name, "ok": True, "kept": int(mask.sum())})
        except Exception as e:
            fetched.append({"node": name, "ok": False, "error": str(e)[:200]})
    if not points:
        return {"ok": False, "error": "no points in crop", "nodes": fetched, "ept": {"url": ept_url}}
    return {"ok": True, "xyz": np.vstack(points), "classification": np.concatenate(classes), "center_xy": (x, y), "query": query, "nodes": fetched, "ept": {"url": ept_url, "srs": ept.get("srs")}}
