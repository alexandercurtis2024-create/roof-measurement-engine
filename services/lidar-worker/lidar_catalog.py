"""Public Maryland LiDAR catalogs. Selection is by location, not by reference measurements."""
from __future__ import annotations

# west, south, east, north. Newer building-class tiles rank first.
DATASETS = [
    {"id": "noaa-10311-anne-arundel-2020", "county": "Anne Arundel", "year": 2020, "building_class": True,
     "url": "https://noaa-nos-coastal-lidar-pds.s3.amazonaws.com/entwine/geoid18/10311/ept.json",
     "bbox": [-76.85, 38.72, -76.36, 39.24]},
    {"id": "noaa-10312-charles-2023", "county": "Charles", "year": 2023, "building_class": True,
     "url": "https://noaa-nos-coastal-lidar-pds.s3.amazonaws.com/entwine/geoid18/10312/ept.json",
     "bbox": [-77.25, 38.25, -76.70, 38.75]},
    {"id": "usgs-de-statewide-2023", "county": "Eastern Shore", "year": 2023, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/DE_Statewide_1_B23/ept.json",
     "bbox": [-76.35, 38.45, -75.05, 39.72]},
    {"id": "usgs-md-southeast-2019", "county": "Wicomico", "year": 2019, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_Southeast_1_2019/ept.json",
     "bbox": [-75.88, 37.90, -75.05, 38.57]},
    {"id": "usgs-howard-2018", "county": "Howard", "year": 2018, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/VA_UpperMiddleNeckQL2_B2_2018/ept.json",
     "bbox": [-77.15, 39.12, -76.65, 39.45]},
    {"id": "noaa-9235-montgomery-pg-2018", "county": "Prince George's", "year": 2018, "building_class": False,
     "url": "https://noaa-nos-coastal-lidar-pds.s3.amazonaws.com/entwine/geoid18/9235/ept.json",
     "bbox": [-77.25, 38.53, -76.65, 39.15]},
    {"id": "usgs-md-western-1-2021", "county": "Western", "year": 2021, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_Western_1_D21/ept.json",
     "bbox": [-79.06, 39.24, -78.00, 39.74]},
    {"id": "usgs-md-western-2-2021", "county": "Western", "year": 2021, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_Western_2_D21/ept.json",
     "bbox": [-78.02, 39.13, -77.83, 39.73]},
    {"id": "usgs-md-va-ncb-2020", "county": "Central", "year": 2020, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_VA_NCB_KGeorge_1_2020/ept.json",
     "bbox": [-77.37, 38.14, -76.01, 39.73]},
    {"id": "usgs-md-calvert-2011", "county": "Calvert", "year": 2011, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_CalvertCo_2011/ept.json",
     "bbox": [-76.71, 38.31, -76.45, 38.73]},
    {"id": "usgs-md-baltimore-2008", "county": "Baltimore", "year": 2008, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_Baltimore_2008/ept.json",
     "bbox": [-76.72, 39.18, -76.54, 39.38]},
    {"id": "usgs-md-allegany-2012", "county": "Allegany", "year": 2012, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_FEMA_AlleganyCo_2012/ept.json",
     "bbox": [-79.08, 39.42, -78.32, 39.74]},
    {"id": "usgs-md-washington-2012", "county": "Washington", "year": 2012, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_FEMA_WashingtonCounty_2012/ept.json",
     "bbox": [-78.36, 39.31, -77.76, 39.74]},
    {"id": "usgs-md-worcester-2011", "county": "Worcester", "year": 2011, "building_class": False,
     "url": "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MD_FEMA_WorcesterCo_2011/ept.json",
     "bbox": [-75.32, 38.01, -75.04, 38.46]},
]

def in_bbox(lon, lat, bbox):
    w, s, e, n = bbox
    return w <= lon <= e and s <= lat <= n

def select_datasets(lon, lat):
    hits = [d for d in DATASETS if in_bbox(lon, lat, d["bbox"])]
    return sorted(hits, key=lambda d: -d["year"])
