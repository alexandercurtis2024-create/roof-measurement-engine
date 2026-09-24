import { resolveStructures } from "./resolve-structure";
import type { BuildingCandidate } from "../providers/types";
import type { Feature, Polygon } from "geojson";

function box(lon: number, lat: number, d = 0.0003, area = 2000, id = "x"): BuildingCandidate {
  return {
    source: "md_imap_microsoft_footprints",
    sourceId: id,
    geometry: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[lon-d,lat-d],[lon+d,lat-d],[lon+d,lat+d],[lon-d,lat+d],[lon-d,lat-d]]] } },
    footprintAreaSqFt: area,
    centroidLon: lon,
    centroidLat: lat,
    attribution: "test",
  };
}

const parcel: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates: [[[-76.5, 39.13], [-76.499, 39.13], [-76.499, 39.131], [-76.5, 39.131], [-76.5, 39.13]]] },
};

const house = box(-76.4995, 39.1305, 0.0002, 2600, "house");
const garage = box(-76.4997, 39.1302, 0.00008, 400, "garage");
const neighbor = box(-76.4985, 39.1305, 0.0002, 9000, "neighbor");

const r = resolveStructures([house, garage, neighbor], { lon: -76.4996, lat: 39.1304 }, parcel);
if (r.primary?.sourceId !== "house") throw new Error("must pick parcel house not largest neighbor");
if (!r.neighbors.some((n) => n.sourceId === "neighbor")) throw new Error("neighbor must be classified");
if (r.confidence === "low") throw new Error("expected moderate or high");
const noParcel = resolveStructures([house, neighbor], { lon: -76.4995, lat: 39.1305 }, null);
if (!noParcel.primary) throw new Error("fallback primary required");
console.log("resolver tests passed");
