# LiDAR worker contract

Frozen engine: v1.0.0-cand (`services/lidar-worker/engine_frozen.py`).
Vercel must not execute it.

POST /api/measurement-jobs { projectId } -> queued job
GET /api/measurement-jobs/{id} -> status

External host runs measure(lon,lat). Never publish eave/rake as Measured.
