import type { Feature, Polygon } from "geojson";
import { fetchJson, qs } from "./http";
import { polygonFromEsriRings } from "../geometry/geo";
import type { ParcelResult } from "./types";

const PROPERTY_POINTS =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0/query";
const PARCEL_POLYS =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0/query";

type EsriQuery = {
  features?: Array<{ attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }>;
};

export async function findMarylandParcelPoint(lon: number, lat: number): Promise<ParcelResult | null> {
  const url = PROPERTY_POINTS + "?" + qs({
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: 4326,
    spatialRel: "esriSpatialRelIntersects", distance: 60, units: "esriSRUnit_Meter",
    outFields: "OBJECTID,JURSCODE,ACCTID,ADDRESS,CITY,ZIPCODE",
    returnGeometry: "true", outSR: 4326, f: "json", resultRecordCount: 8,
  });
  const res = await fetchJson<EsriQuery>(url);
  const feats = res.data?.features ?? [];
  if (!feats.length) return null;
  const hit = feats[0];
  const a = hit.attributes;
  return {
    provider: "md_imap_property_points",
    parcelId: String(a.ACCTID ?? a.OBJECTID ?? ""),
    jurisdictionCode: String(a.JURSCODE ?? ""),
    address: String(a.ADDRESS ?? ""),
    geometry: null,
    metadata: { ...a, attribution: "MD iMAP, MDP, SDAT — Maryland Property Data Parcel Points" },
  };
}

export async function findMarylandParcelPolygon(lon: number, lat: number): Promise<Feature<Polygon> | null> {
  const url = PARCEL_POLYS + "?" + qs({
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,ACCTID,JURSCODE,ADDRESS,CITY,ZIPCODE",
    returnGeometry: "true", outSR: 4326, f: "json", resultRecordCount: 1,
  });
  const res = await fetchJson<EsriQuery>(url, {}, 25000);
  const feat = res.data?.features?.[0];
  if (!feat?.geometry?.rings) return null;
  return polygonFromEsriRings(feat.geometry.rings, 4326);
}

export async function lookupParcel(lon: number, lat: number): Promise<ParcelResult | null> {
  const point = await findMarylandParcelPoint(lon, lat);
  const poly = await findMarylandParcelPolygon(lon, lat).catch(() => null);
  if (!point && !poly) return null;
  if (point) return { ...point, geometry: poly };
  return {
    provider: "md_imap_parcel_boundaries",
    parcelId: "unknown",
    geometry: poly,
    metadata: { attribution: "MD iMAP, MDP, SDAT — Parcel Boundaries" },
  };
}
