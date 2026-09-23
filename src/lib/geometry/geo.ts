import area from "@turf/area";
import bbox from "@turf/bbox";
import bearing from "@turf/bearing";
import buffer from "@turf/buffer";
import centroid from "@turf/centroid";
import destination from "@turf/destination";
import distance from "@turf/distance";
import { feature, lineString, point, polygon } from "@turf/helpers";
import length from "@turf/length";
import rewind from "@turf/rewind";
import type { Feature, Polygon, MultiPolygon, Position, LineString } from "geojson";

export type LonLat = { lon: number; lat: number };

export function polygonFromEsriRings(rings: number[][][], wkid?: number): Feature<Polygon> | null {
  if (!rings?.length) return null;
  const coords = rings.map((ring) =>
    ring.map(([x, y]) => (wkid === 4326 || !wkid || wkid === 4326 ? [x, y] : webMercatorToWgs84(x, y))),
  );
  try {
    const poly = polygon(coords);
    return rewind(poly, { reverse: false }) as Feature<Polygon>;
  } catch {
    return null;
  }
}

export function webMercatorToWgs84(x: number, y: number): [number, number] {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

export function featureAreaSqFt(geom: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon) {
  const feat = "type" in geom && geom.type !== "Feature" ? feature(geom as Polygon) : (geom as Feature<Polygon>);
  return area(feat) * 10.76391041671;
}

export function featurePerimeterFt(geom: Feature<Polygon | MultiPolygon> | Polygon) {
  const feat = "type" in geom && geom.type !== "Feature" ? feature(geom as Polygon) : (geom as Feature<Polygon>);
  return length(feat, { units: "kilometers" }) * 3280.839895;
}

export function lineLengthFt(line: Feature<LineString> | LineString | Position[]) {
  const feat = Array.isArray(line)
    ? lineString(line as Position[])
    : "type" in line && line.type === "LineString"
      ? feature(line)
      : (line as Feature<LineString>);
  return length(feat, { units: "feet" });
}

export function centroidLonLat(geom: Feature<Polygon | MultiPolygon> | Polygon): LonLat {
  const feat = "type" in geom && geom.type !== "Feature" ? feature(geom as Polygon) : (geom as Feature<Polygon>);
  const c = centroid(feat);
  return { lon: c.geometry.coordinates[0], lat: c.geometry.coordinates[1] };
}

export function distanceMeters(a: LonLat, b: LonLat) {
  return distance(point([a.lon, a.lat]), point([b.lon, b.lat]), { units: "meters" });
}

export function bboxOf(geom: Feature<Polygon | MultiPolygon> | Polygon, bufferMeters = 0) {
  const feat = "type" in geom && geom.type !== "Feature" ? feature(geom as Polygon) : (geom as Feature<Polygon>);
  const buffered = bufferMeters > 0 ? buffer(feat, bufferMeters, { units: "meters" }) : feat;
  const [minX, minY, maxX, maxY] = bbox(buffered!);
  return { minLon: minX, minLat: minY, maxLon: maxX, maxLat: maxY };
}

export function polygonEdges(geom: Feature<Polygon> | Polygon): Position[][] {
  const coords = ("geometry" in geom ? geom.geometry.coordinates : geom.coordinates)[0];
  const edges: Position[][] = [];
  for (let i = 0; i < coords.length - 1; i++) edges.push([coords[i], coords[i + 1]]);
  return edges;
}

export function slopeDegreesFromPitch(riseOver12: number) {
  return (Math.atan(riseOver12 / 12) * 180) / Math.PI;
}

export function slopedAreaFromFootprint(footprintSqFt: number, slopeDeg: number) {
  const cos = Math.cos((slopeDeg * Math.PI) / 180);
  if (cos <= 0.05) return footprintSqFt;
  return footprintSqFt / cos;
}

export function formatPitch(riseOver12: number | null | undefined) {
  if (riseOver12 === null || riseOver12 === undefined || Number.isNaN(riseOver12)) return "Unavailable";
  const rounded = Math.round(riseOver12 * 10) / 10;
  const nearest = Math.round(riseOver12);
  if (Math.abs(rounded - nearest) < 0.15) return `${nearest}/12`;
  return `≈ ${nearest}/12 (${rounded.toFixed(1)}/12)`;
}

export function osmWaysToPolygons(osm: {
  elements: Array<{ type: string; id: number; nodes?: number[]; lat?: number; lon?: number }>;
}): Feature<Polygon>[] {
  const nodes = new Map<number, Position>();
  for (const el of osm.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) nodes.set(el.id, [el.lon, el.lat]);
  }
  const polys: Feature<Polygon>[] = [];
  for (const el of osm.elements) {
    if (el.type !== "way" || !el.nodes || el.nodes.length < 4) continue;
    const ring = el.nodes.map((id) => nodes.get(id)).filter(Boolean) as Position[];
    if (ring.length < 4) continue;
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
    try {
      polys.push(rewind(polygon([ring])) as Feature<Polygon>);
    } catch {}
  }
  return polys;
}

export { destination, point, polygon, bearing };
