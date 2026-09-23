import { fetchJson, qs } from "./http";
import { centroidLonLat, featureAreaSqFt, osmWaysToPolygons, polygonFromEsriRings } from "../geometry/geo";
import type { BuildingCandidate } from "./types";

const MD_FOOTPRINTS =
  "https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_BuildingFootprints/MapServer/0/query";

type EsriQuery = { features?: Array<{ attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }> };

export async function queryMarylandFootprints(lon: number, lat: number, radiusM = 90): Promise<BuildingCandidate[]> {
  const url = MD_FOOTPRINTS + "?" + qs({
    geometry: `${lon},${lat}`, geometryType: "esriGeometryPoint", inSR: 4326,
    spatialRel: "esriSpatialRelIntersects", distance: radiusM, units: "esriSRUnit_Meter",
    outFields: "OBJECTID", returnGeometry: "true", outSR: 4326, f: "json", resultRecordCount: 40,
  });
  const res = await fetchJson<EsriQuery>(url);
  const out: BuildingCandidate[] = [];
  for (const f of res.data?.features ?? []) {
    if (!f.geometry?.rings) continue;
    const geom = polygonFromEsriRings(f.geometry.rings, 4326);
    if (!geom) continue;
    const c = centroidLonLat(geom);
    out.push({
      source: "md_imap_microsoft_footprints",
      sourceId: String(f.attributes.OBJECTID ?? ""),
      geometry: geom,
      footprintAreaSqFt: featureAreaSqFt(geom),
      centroidLon: c.lon,
      centroidLat: c.lat,
      attribution: "MD iMAP / Microsoft US Building Footprints. Reference-only; not surveyed.",
    });
  }
  return out;
}

export async function queryOsmBuildings(lon: number, lat: number, radiusM = 80): Promise<BuildingCandidate[]> {
  const query = `[out:json][timeout:25];way["building"](around:${radiusM},${lat},${lon});(._;>;);out body;`;
  const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);
  const res = await fetchJson<{ elements: Array<{ type: string; id: number; nodes?: number[]; lat?: number; lon?: number }> }>(url, {}, 25000);
  if (!res.data?.elements) return [];
  return osmWaysToPolygons(res.data).map((geom, i) => {
    const c = centroidLonLat(geom);
    return {
      source: "openstreetmap",
      sourceId: `osm-${i}`,
      geometry: geom,
      footprintAreaSqFt: featureAreaSqFt(geom),
      centroidLon: c.lon,
      centroidLat: c.lat,
      attribution: "© OpenStreetMap contributors",
    };
  });
}

export async function findBuildings(lon: number, lat: number) {
  const warnings: string[] = [];
  let md: BuildingCandidate[] = [];
  try { md = await queryMarylandFootprints(lon, lat); } catch { warnings.push("Maryland iMAP building footprint query failed."); }
  let osm: BuildingCandidate[] = [];
  try { osm = await queryOsmBuildings(lon, lat); } catch { warnings.push("OpenStreetMap building query failed."); }
  if (!md.length) warnings.push("No MD iMAP/Microsoft footprints found near the address point.");
  if (md.length) {
    warnings.push("Statewide footprints are Microsoft-generated polygons hosted by MD iMAP and are not surveyed.");
  }
  const merged = [...md];
  for (const o of osm) {
    const dup = merged.some((m) => Math.hypot(m.centroidLon - o.centroidLon, m.centroidLat - o.centroidLat) < 0.00008);
    if (!dup) merged.push(o);
  }
  return { candidates: merged, warnings };
}
