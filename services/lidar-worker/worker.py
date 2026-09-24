#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys, urllib.request
from engine_frozen import VERSION
from measure_targeted import measure_targeted
WORKER_VERSION = "2026-09-24-mask"

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

def main(job_id):
    claimed = api("POST", f"/api/measurement-jobs/{job_id}/claim", {})
    lon, lat = claimed["lon"], claimed["lat"]
    if lon is None or lat is None:
        api("POST", f"/api/measurement-jobs/{job_id}/fail", {"error": "missing coordinates"})
        return 2
    api("POST", f"/api/measurement-jobs/{job_id}/progress", {"stage": "acquiring_lidar", "progress": 20})
    rec = measure_targeted(float(lon), float(lat), claimed.get("address") or job_id, claimed.get("targetGeometry"), claimed.get("neighborGeometries") or [])
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
        "diagnostics": {"roof_points": rec.get("roof_points"), "masked": rec.get("masked")},
    })
    return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: worker.py <job-id>"); sys.exit(1)
    sys.exit(main(sys.argv[1]))
