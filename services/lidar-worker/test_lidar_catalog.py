from lidar_catalog import select_datasets

def ids(lon, lat):
    return [d["id"] for d in select_datasets(lon, lat)]

aa = ids(-76.489366, 39.138663)
assert aa[0] == "noaa-10311-anne-arundel-2020", aa
howard = ids(-76.9285885, 39.3162341)
assert "usgs-howard-2018" in howard, howard
pg = ids(-76.7335402, 38.8553466)
assert "noaa-9235-montgomery-pg-2018" in pg, pg
shore = ids(-75.597119, 38.342471)
assert "usgs-md-southeast-2019" in shore, shore
outside = ids(-80.5, 39.6)
assert outside == [], outside
print("lidar catalog tests passed")
