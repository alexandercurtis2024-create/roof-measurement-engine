# Carnoustie 4690 vs 4961

Not an engine change. engine_frozen.py was not modified.

Frozen benchmark input:
- center: -76.4816045, 39.130015 (roof-centered coordinate used in lab)
- crop: engine default 40 m around that point
- mask: none
- roof points: 4022
- sloped area: 4960.83 sq ft

Production automatic input:
- center: centroid of auto-selected 3,630 sq ft footprint
- crop: 40 m, then target footprint + 4 m minus neighbor polygons
- mask: applied in measure_targeted.py (worker), not in engine_frozen.py
- result: 4,690 sq ft

Unmasked production crop on the same job family: 6,015 sq ft (neighbor contamination).

Conclusion:
The 271 sq ft (5.5%) drop from 4,961 to 4,690 is the footprint mask removing roof-like points outside the GIS outline (eaves/wings) plus a different crop center than the lab coordinate.

Do not widen the mask to chase 4,961 or EagleView 5,030.
The mask exists to prevent the 6,015 neighbor failure.
