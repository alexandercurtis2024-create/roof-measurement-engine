import type { Feature, Polygon } from "geojson";

export type GeocodeResult = {
  provider: string;
  matchedAddress: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  lon: number;
  lat: number;
  quality: string;
  confidence: number;
  metadata: Record<string, unknown>;
};

export type ParcelResult = {
  provider: string;
  parcelId: string;
  county?: string;
  jurisdictionCode?: string;
  address?: string;
  geometry?: Feature<Polygon> | null;
  metadata: Record<string, unknown>;
};

export type BuildingCandidate = {
  source: string;
  sourceId?: string;
  geometry: Feature<Polygon>;
  footprintAreaSqFt: number;
  centroidLon: number;
  centroidLat: number;
  attribution: string;
};

export type ElevationSample = {
  provider: string;
  dataset: string;
  lon: number;
  lat: number;
  elevation: number;
  units: "meters" | "feet";
  resolution?: string;
  acquisitionDate?: string;
  raw: Record<string, unknown>;
};

export type LidarDiscovery = {
  provider: string;
  dataset: string;
  title: string;
  downloadUrl?: string;
  sizeBytes?: number;
  format?: string;
  notes?: string;
};
