export type CoverageLevel = "full" | "partial" | "discoverable" | "manual_review_likely" | "unsupported";

export type JurisdictionCoverage = {
  name: string;
  fips?: string;
  code?: string;
  address: CoverageLevel;
  parcel: CoverageLevel;
  footprint: CoverageLevel;
  elevation: CoverageLevel;
  lidar: CoverageLevel;
  imagery: CoverageLevel;
  notes: string;
};

export const MARYLAND_STATE: JurisdictionCoverage = {
  name: "Maryland (statewide)",
  fips: "24",
  address: "full",
  parcel: "full",
  footprint: "partial",
  elevation: "partial",
  lidar: "discoverable",
  imagery: "partial",
  notes: "Census geocoder + MD iMAP parcels statewide. Footprints are Microsoft-generated via MD iMAP. Elevation is bare-earth DEM + USGS 3DEP. LiDAR tiles are discoverable via The National Map.",
};

const CODES: Record<string, string> = {
  ALEG: "Allegany", ANAR: "Anne Arundel", BALC: "Baltimore", BACI: "Baltimore City",
  CALV: "Calvert", CARO: "Caroline", CARR: "Carroll", CECI: "Cecil", CHAR: "Charles",
  DORC: "Dorchester", FRED: "Frederick", GARR: "Garrett", HARF: "Harford", HOWA: "Howard",
  KENT: "Kent", MONT: "Montgomery", PRIN: "Prince George's", QUEE: "Queen Anne's",
  SOME: "Somerset", STMA: "St. Mary's", TALB: "Talbot", WASH: "Washington", WICO: "Wicomico", WORC: "Worcester",
};

export const COUNTY_COVERAGE: JurisdictionCoverage[] = Object.entries(CODES).map(([code, name]) => ({
  name, code, address: "full", parcel: "full", footprint: "partial", elevation: "partial",
  lidar: "discoverable", imagery: "partial",
  notes: "Statewide MD iMAP + USGS adapters apply.",
}));

export function jurisdictionFromCode(code?: string | null) {
  if (!code) return MARYLAND_STATE;
  const name = CODES[code];
  return COUNTY_COVERAGE.find((c) => c.code === code) ?? { ...MARYLAND_STATE, name: name || MARYLAND_STATE.name };
}

export function coverageLabel(level: CoverageLevel) {
  switch (level) {
    case "full": return "Full automated coverage";
    case "partial": return "Partial coverage";
    case "discoverable": return "Discoverable / not auto-ingested";
    case "manual_review_likely": return "Manual review likely";
    case "unsupported": return "Unsupported";
  }
}
