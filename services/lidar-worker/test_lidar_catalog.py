from lidar_catalog import select_datasets

def ids(lon, lat):
    return [d["id"] for d in select_datasets(lon, lat)]

aa = ids(-76.489366, 39.138663)  # Devere, Anne Arundel
assert aa and aa[0] == "noaa-10311-anne-arundel-2020", aa
charles = ids(-77.0, 38.5)
assert "noaa-10312-charles-2023" in charles, charles
shore = ids(-75.9, 38.9)
assert any("de-statewide" in i or "southeast" in i for i in shore), shore
west = ids(-78.7, 39.6)
assert any("western" in i or "allegany" in i for i in west), west
outside = ids(-80.5, 39.6)
assert outside == [], outside
print("lidar catalog tests passed", len(aa), len(charles), len(west))
