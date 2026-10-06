export type CountyMode = "measured" | "estimate" | "unavailable";

export const COUNTY_COVERAGE: { name: string; mode: CountyMode; note: string; bbox: [number, number, number, number] }[] = [
  { name: "Anne Arundel", mode: "measured", note: "2020 tile labels buildings.", bbox: [-76.85, 38.72, -76.36, 39.24] },
  { name: "Allegany", mode: "estimate", note: "2021 western tile has elevation, no building class.", bbox: [-78.95, 39.42, -78.32, 39.74] },
  { name: "Washington", mode: "estimate", note: "2012 tile has elevation, no building class.", bbox: [-78.32, 39.31, -77.45, 39.74] },
  { name: "Howard", mode: "estimate", note: "2018 tile has elevation, no building class.", bbox: [-77.15, 39.12, -76.65, 39.45] },
  { name: "Montgomery", mode: "estimate", note: "2018 Montgomery/Prince George's tile, no building class.", bbox: [-77.25, 38.95, -76.90, 39.35] },
  { name: "Prince George's", mode: "estimate", note: "2018 tile has elevation, no building class.", bbox: [-77.05, 38.53, -76.65, 39.05] },
  { name: "Charles", mode: "estimate", note: "2023 tile has points. Building class was not present at the county seat sample.", bbox: [-77.25, 38.25, -76.70, 38.75] },
  { name: "Calvert", mode: "unavailable", note: "No points at the county seat in the public tiles.", bbox: [-76.71, 38.31, -76.45, 38.73] },
  { name: "St. Mary's", mode: "unavailable", note: "No points at the county seat in the public tiles.", bbox: [-76.90, 38.05, -76.30, 38.45] },
  { name: "Wicomico", mode: "estimate", note: "2019 tile has elevation, no building class. Trees can block the estimate.", bbox: [-75.88, 38.20, -75.35, 38.55] },
  { name: "Worcester", mode: "estimate", note: "2019 tile has elevation, no building class.", bbox: [-75.40, 38.01, -75.04, 38.46] },
  { name: "Somerset", mode: "estimate", note: "2019 tile has elevation, no building class.", bbox: [-75.95, 37.90, -75.55, 38.25] },
  { name: "Dorchester", mode: "estimate", note: "Eastern Shore tile is sparse and does not label buildings.", bbox: [-76.40, 38.25, -75.80, 38.75] },
  { name: "Talbot", mode: "estimate", note: "Eastern Shore tile is sparse and does not label buildings.", bbox: [-76.40, 38.60, -75.95, 38.95] },
  { name: "Caroline", mode: "estimate", note: "Eastern Shore tile is sparse and does not label buildings.", bbox: [-76.00, 38.75, -75.55, 39.15] },
  { name: "Kent", mode: "estimate", note: "Eastern Shore tile is sparse and does not label buildings.", bbox: [-76.30, 39.05, -75.80, 39.40] },
  { name: "Queen Anne's", mode: "unavailable", note: "No points at the county seat.", bbox: [-76.40, 38.85, -75.90, 39.25] },
  { name: "Cecil", mode: "unavailable", note: "No points at the county seat.", bbox: [-76.20, 39.35, -75.75, 39.72] },
  { name: "Harford", mode: "unavailable", note: "No points at the county seat.", bbox: [-76.50, 39.40, -76.10, 39.72] },
  { name: "Baltimore County", mode: "unavailable", note: "Central tile box overlaps, but the county seat returned no points.", bbox: [-76.90, 39.35, -76.35, 39.72] },
  { name: "Baltimore City", mode: "unavailable", note: "No points at the city center in the public tiles.", bbox: [-76.72, 39.20, -76.52, 39.38] },
  { name: "Carroll", mode: "unavailable", note: "No points at the county seat.", bbox: [-77.20, 39.40, -76.75, 39.72] },
  { name: "Frederick", mode: "unavailable", note: "No public tile covers the county seat.", bbox: [-77.70, 39.20, -77.25, 39.72] },
  { name: "Garrett", mode: "unavailable", note: "Western tile is assigned, but the county seat returned no points.", bbox: [-79.50, 39.18, -78.90, 39.72] },
];

export function countyCoverage(lon?: number | null, lat?: number | null) {
  if (lon == null || lat == null) return null;
  return COUNTY_COVERAGE.find((c) => lon >= c.bbox[0] && lon <= c.bbox[2] && lat >= c.bbox[1] && lat <= c.bbox[3]) || null;
}
