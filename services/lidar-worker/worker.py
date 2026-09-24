#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys, urllib.request
from engine_frozen import VERSION, measure
WORKER_VERSION = "2026-09-24-target"

def api(method, path, body=None):
    base = os.environ["APP_BASE_URL"].rstrip("/")
    secret = os.environ["WORKER_SECRET"]
    req = urllib.request.Request(
        f"{base}{path}",
        data=None if body is None else json.dumps(body).encode(),
        method=method,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json", "User-Agent": f"rme-worker/{WORKER_VERSION}"},
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode())

def _ring(geom):
    if not geom: return None
    coords = geom.get("coordinates") or (geom.get("geometry") or {}).get("coordinates")
    if not coords: return None
    ring = coords[0][0] if isinstance(coords[0][0][0], (list, tuple)) else coords[0] if isinstance(coords[0][0], (list, tuple)) else coords
    return ring

def isolate(rec, target_geom, neighbor_geoms):
    try:
        from shapely.geometry import Point, Polygon
        from pyproj import Transformer
    except Exception:
        return rec
    ring = _ring(target_geom)
    if not ring or not rec.get("facets"):
        return rec
    t = Transformer.from_crs("EPSG:4326", "EPSG:3748", always_xy=True)
    def poly(r, buf):
        xy = [t.transform(float(p[0]), float(p[1])) for p in r if len(p) >= 2]
        if len(xy) < 4: return None
        p = Polygon(xy)
        return p.buffer(buf) if buf else p
    target = poly(ring, 3.0)
    if target is None or target.is_empty:
        return rec
    excl = []
    for g in neighbor_geoms or []:
        rr = _ring(g)
        if not rr: continue
        p = poly(rr, -0.4)
        if p and not p.is_empty: excl.append(p)
    kept = []
    for f in rec["facets"]:
        pts = f.get("ring_utm") or []
        if len(pts) < 3: continue
        c = Point(sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts))
        if any(e.contains(c) for e in excl): continue
        if target.contains(c) or target.distance(c) <= 4.0:
            kept.append(f)
    if not kept:
        return rec
    area = sum(float(f.get("area_plane_sqft") or 0) for f in kept)
    pitches = [float(f["pitch_rise"]) for f in kept if f.get("slope_deg", 0) >= 18 and f.get("pitch_rise") is not None]
    rec = dict(rec)
    rec["facets"] = kept
    rec["facet_count"] = len(kept)
    rec["total_sloped_sqft"] = area
    rec["squares"] = area / 100.0
    if pitches:
        rec["predominant_pitch_rise_slope_ge_18deg"] = sorted(pitches)[len(pitches)//2]
    rec["isolation"] = {"kept": len(kept), "dropped": rec.get("facet_count", 0)}
    return rec

def main(job_id):
    claimed = api("POST", f"/api/measurement-jobs/{job_id}/claim", {})
    lon, lat = claimed["lon"], claimed["lat"]
    if lon is None or lat is None:
        api("POST", f"/api/measurement-jobs/{job_id}/fail", {"error": "missing coordinates"})
        return 2
    api("POST", f"/api/measurement-jobs/{job_id}/progress", {"stage": "acquiring_lidar", "progress": 20})
    rec = measure(float(lon), float(lat), claimed.get("address") or job_id)
    rec = isolate(rec, claimed.get("targetGeometry"), claimed.get("neighborGeometries") or [])
    if not rec.get("ok") or rec.get("mode") == "UNAVAILABLE":
        api("POST", f"/api/measurement-jobs/{job_id}/fail", {"error": rec.get("reason") or "engine unavailable"})
        return 3
    raw = rec.get("predominant_pitch_rise_slope_ge_18deg")
    display = f"≈ {round(raw)}/12" if raw is not None else "unavailable"
    api("POST", f"/api/measurement-jobs/{job_id}/complete", {
        "engineVersion": rec.get("algorithmVersion") or VERSION,
        "workerVersion": WORKER_VERSION,
        "roofAreaSqFt": rec["total_sloped_sqft"],
        "squares": rec["squares"],
        "predominantPitchRaw": raw,
        "predominantPitchDisplay": display,
        "facetCount": rec.get("facet_count"),
        "confidence": "moderate",
        "provenance": rec.get("area_mode"),
        "diagnostics": {"roof_points": rec.get("roof_points"), "isolation": rec.get("isolation")},
        "experimentalEdges": {"ridge_ft": rec.get("ridge_ft"), "hip_ft": rec.get("hip_ft"), "valley_ft": rec.get("valley_ft"), "eave_ft": rec.get("eave_ft"), "rake_ft": rec.get("rake_ft")},
    })
    return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: worker.py <job-id>"); sys.exit(1)
    sys.exit(main(sys.argv[1]))
