#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys, urllib.request
from engine_frozen import VERSION
from measure_targeted import measure_targeted
WORKER_VERSION = "2026-10-06-unclassified"

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

def contractor_reason(rec):
    reason = rec.get("reason") or rec.get("error") or "engine unavailable"
    if reason == "no_maryland_lidar_tile":
        return "No public roof elevation tile covers this property yet."
    if reason == "unclassified_planar_points":
        return "Elevation was found, but this tile does not label buildings. The area is an estimate from planar points and should be verified."
    if reason in ("insufficient_building_class_points", "insufficient_roof_candidates", "no_points_in_tile"):
        return "A LiDAR tile was found, but it did not contain a measurable roof for this house."
    return str(reason)

def main(job_id):
    claimed = api("POST", f"/api/measurement-jobs/{job_id}/claim", {})
    lon, lat = claimed["lon"], claimed["lat"]
    if lon is None or lat is None:
        api("POST", f"/api/measurement-jobs/{job_id}/fail", {"error": "missing coordinates"})
        print("missing coordinates", flush=True)
        return 2
    api("POST", f"/api/measurement-jobs/{job_id}/progress", {"stage": "acquiring_lidar", "progress": 20})
    rec = measure_targeted(float(lon), float(lat), claimed.get("address") or job_id, claimed.get("targetGeometry"), claimed.get("neighborGeometries") or [])
    print(json.dumps({"ok": rec.get("ok"), "mode": rec.get("mode"), "reason": rec.get("reason"), "dataset": rec.get("dataset"), "roof_points": rec.get("roof_points"), "label": rec.get("label")}), flush=True)
    if not rec.get("ok") or rec.get("mode") == "UNAVAILABLE":
        msg = contractor_reason(rec)
        api("POST", f"/api/measurement-jobs/{job_id}/fail", {"error": msg})
        print(msg, flush=True)
        return 3
    raw = rec.get("predominant_pitch_rise_slope_ge_18deg")
    display = f"≈ {round(raw)}/12" if raw is not None else "unavailable"
    estimated = rec.get("area_mode") == "ESTIMATED"
    api("POST", f"/api/measurement-jobs/{job_id}/complete", {
        "engineVersion": rec.get("algorithmVersion") or VERSION,
        "workerVersion": WORKER_VERSION,
        "roofAreaSqFt": rec["total_sloped_sqft"],
        "squares": rec["squares"],
        "predominantPitchRaw": raw,
        "predominantPitchDisplay": display,
        "facetCount": rec.get("facet_count"),
        "confidence": "low" if estimated else "moderate",
        "provenance": rec.get("area_mode"),
        "dataset": rec.get("dataset"),
        "diagnostics": {"roof_points": rec.get("roof_points"), "masked": rec.get("masked"), "dataset": rec.get("dataset")},
    })
    return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: worker.py <job-id>"); sys.exit(1)
    sys.exit(main(sys.argv[1]))
