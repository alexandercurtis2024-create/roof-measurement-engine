# Sources checked for roof measurement, 2026-10-06

Usable now:
- NOAA and USGS Entwine point clouds already in the catalog.
- Building-class points: measured path. Anne Arundel 2020 is the confirmed case.
- Unclassified non-ground points: estimate path. Used where a tile has returns but no building class.

Checked and not a roof measurement:
- MD iMAP lidar ImageServer, statewide and every county folder. Services are DEM, slope, aspect, and hillshade. The DEM is bare earth. Buildings are removed, so it cannot produce pitch or sloped area.
- Montgomery Planning public elevation service. Only the bare-earth DTM is queryable. The county DSM and nDSM are large file downloads, not a point query.
- MD iMAP point-cloud bulk download page. Links are suspended.
- Microsoft and MD iMAP building footprints. Plan area only. No pitch.
- NAIP and aerial imagery. No stereo surface, so no pitch.

Not wired because it is not free:
- USGS s3://usgs-lidar requester-pays bucket. It has more 3DEP point clouds than the public EPT bucket. Access requires an AWS account and egress charges.

Counties with no points at the seat still have no free roof surface to sample.
