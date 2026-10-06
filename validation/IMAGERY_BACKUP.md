# Imagery backup

Source: NAIP-CHM 2023, 0.6 m structure height, public HTTP tiles.
Used only after LiDAR returns no roof.
Masked to the building footprint.
Pitch is withheld when the height fit is too noisy, which is the tree-cover case.

Halsey test, not used to tune:
- imagery estimate about 1,267 sq ft
- pitch withheld
- EagleView reference 938 sq ft, 5/12
