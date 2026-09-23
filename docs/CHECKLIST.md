# Development checklist

## COMPLETE
- Account signup/login on production HTTPS
- Neon Postgres + Prisma schema
- PWA Add to Home Screen
- Maryland address form
- Census geocode + Nominatim fallback
- MD iMAP parcel lookup
- MD iMAP + OSM building footprints
- Multi-building selection
- Footprint area/perimeter (measured)
- Provenance + confidence records
- HTML + PDF report of whatever exists

## IN PROGRESS
- Automatic pitch from LiDAR planes
- True sloped surface from reconstructed facets

## BLOCKED
- In-request LAZ ingest (tiles ~100MB; needs worker + storage)

## NOT STARTED / HONESTLY UNAVAILABLE IN WEB TIER
- Ridge/hip/valley classification from planes
- Vegetation flags from first-return DSM
- CV chimney/solar detection
