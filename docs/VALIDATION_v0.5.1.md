# v0.5.0 / v0.5.1 raw LiDAR audit (Devere)

Frozen after run. EagleView used only here.

## Raw classes in 40 m crop
class 2 ground 25308, class 1 unclassified 18727, class 6 building 6994, class 5 veg 3995, class 4 veg 908.

## Outward bands (any-plane residual < 0.16)
0–0.5 m: 389 raw, 111 plane-ok (class 1: 53, class 6: 56). plane-ok density 2.4 / m².
0.5–1.0 m: 41 plane-ok (29 class 1, 9 class 6).
Beyond 1 m: class 6 nearly gone; plane-ok mixes class 1 + veg + ground; residual p50 ~1.2–1.4 m.

## Parent-plane ABC on current exterior (v0.5.1)
A supported extension: 52 ft (22%)
B observed termination: 156 ft (66%)
C unobserved: 29 ft (12%)

Recovered attachable points: 24.
Exterior still ~335 ft. Eave still ~111 ft.

## After freeze vs EV
area 3528 vs 3515 (coincidental), facets 21 vs 26, pitch 8.73 vs 9/12,
ridge 63 vs 82, hip 179 vs 120, valley 130 vs 102, eave 111 vs 277, rake 63 vs 154.
