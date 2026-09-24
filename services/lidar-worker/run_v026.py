from __future__ import annotations
import numpy as np
def connected_component_mask(xy, cell=1.0, min_size=40):
    x0, y0 = xy.min(0)
    ij = np.floor((xy - [x0, y0]) / cell).astype(int)
    cells = {}
    for n, key in enumerate(map(tuple, ij)):
        cells.setdefault(key, []).append(n)
    unused = set(cells)
    best = []
    while unused:
        seed = unused.pop()
        stack = [seed]
        comp = [seed]
        while stack:
            i, j = stack.pop()
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    k = (i + di, j + dj)
                    if k in unused:
                        unused.remove(k)
                        stack.append(k)
                        comp.append(k)
        idx = [n for c in comp for n in cells[c]]
        if len(idx) > len(best):
            best = idx
    return np.array(best) if best else np.arange(len(xy))
