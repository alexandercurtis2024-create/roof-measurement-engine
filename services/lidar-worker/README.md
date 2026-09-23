# LiDAR worker v0.2.0

Python service that:
1. Crops NOAA/USGS Entwine Point Tiles to building+buffer (no statewide download)
2. Extracts candidate rooftop points using class + height-above-ground
3. Fits RANSAC planes in source metres (EPSG:3748 + NAVD88 for Anne Arundel 2020)

This does **not** run inside a normal Vercel request.

Frozen independent prediction (no EagleView inputs):
`validation/frozen_v0.2.0_1510_devere.json`

Area from XY bounding boxes is **not** contractor-grade. Pitch from plane normals is the v0.2.0 deliverable.
