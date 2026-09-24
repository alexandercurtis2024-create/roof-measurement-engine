# Validation history — 1510 Devere Dr (blinded)

EagleView #72480732 used ONLY after each freeze.

Reference: 3515 sqft, 35.15 squares, 26 facets, 9/12, ridge 82, hip 120, valley 102, eave 277, rake 154.

| Version | Sloped sqft | Squares | Facets | Pitch all | Pitch ≥18° | Notes |
|---|---|---|---|---|---|---|
| v0.2.0 | rejected bbox | — | 14 planes | 6.85 | ~8.7–9.4 | no polygons |
| v0.2.1 | 1319 | 13.19 | 7 | 16.6 | 8.6–9.3 | walls included |
| v0.2.2 | 3122 | 31.22 | 18 | 6.94 | — | 55° cap; 217 sqft overlap |
| v0.2.3 | 533 | 5.33 | 3 | 2.66 | — | DSM grow failed |
| v0.2.4 | 409 | 4.09 | 2 | 0.19 | — | DSM grow failed |
| v0.2.5 | 2759 | 27.59 | 17 | 6.81 | 8.74 | overlap clipped |
| v0.2.6 | 2784 | 27.84 | 16 | 6.64 | 8.74 | class-6 component mask |
| v0.2.7 | 3382 | 33.82 | 16 | 6.64 | 8.74 | hull + median NN spacing |

v0.2.7 vs EagleView after freeze:

- Area 3382 vs 3515 (−3.8%)
- Squares 33.82 vs 35.15
- Facets 16 vs 26
- Steep-plane pitch 8.74/12 vs 9/12
- Edges still not contractor-grade
