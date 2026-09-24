import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import booleanIntersects from "@turf/boolean-intersects";
import { point } from "@turf/helpers";
import type { Feature, Polygon } from "geojson";
import type { BuildingCandidate } from "../providers/types";
import { distanceMeters } from "../geometry/geo";

export type ResolvedBuilding = BuildingCandidate & {
  distanceToAddressM: number;
  rankScore: number;
  rankReason: string;
  onParcel: boolean;
  role: "primary" | "accessory" | "neighbor" | "unknown";
};

export type StructureResolution = {
  primary: ResolvedBuilding | null;
  accessories: ResolvedBuilding[];
  neighbors: ResolvedBuilding[];
  all: ResolvedBuilding[];
  confidence: "high" | "moderate" | "low";
  reason: string;
};

function onParcel(b: BuildingCandidate, parcel: Feature<Polygon> | null | undefined) {
  if (!parcel) return false;
  try {
    return booleanPointInPolygon(point([b.centroidLon, b.centroidLat]), parcel);
  } catch {
    return false;
  }
}

function touchesParcel(b: BuildingCandidate, parcel: Feature<Polygon> | null | undefined) {
  if (!parcel) return false;
  try {
    return booleanIntersects(b.geometry, parcel);
  } catch {
    return false;
  }
}

export function resolveStructures(
  candidates: BuildingCandidate[],
  address: { lon: number; lat: number },
  parcel?: Feature<Polygon> | null,
): StructureResolution {
  const scored: ResolvedBuilding[] = candidates.map((c) => {
    const dist = distanceMeters({ lon: c.centroidLon, lat: c.centroidLat }, address);
    const area = c.footprintAreaSqFt;
    const inside = onParcel(c, parcel);
    const touches = touchesParcel(c, parcel);
    let score = 0;
    if (inside) score += 90;
    else if (touches) score += 35;
    else if (parcel) score -= 50;
    score += Math.max(0, 45 - dist / 2);
    if (area >= 800 && area <= 12000) score += 28;
    else if (area > 12000 && area <= 25000) score += 12;
    else if (area >= 180 && area < 800) score += 6;
    else if (area < 180) score -= 15;
    if (c.source.startsWith("md_imap")) score += 6;
    const reasons = [
      inside ? "on parcel" : touches ? "touches parcel" : parcel ? "off parcel" : "no parcel",
      `${Math.round(dist)} m from address`,
      `${Math.round(area)} sq ft`,
    ];
    return {
      ...c,
      distanceToAddressM: dist,
      rankScore: score,
      rankReason: reasons.join(" · "),
      onParcel: inside || touches,
      role: "unknown" as const,
    };
  }).sort((a, b) => b.rankScore - a.rankScore);

  const parcelSet = parcel ? scored.filter((b) => b.onParcel) : scored;
  const pool = parcelSet.length ? parcelSet : scored;
  const primary = pool[0] || null;
  const accessories = pool.filter((b) => {
    if (!primary || b.sourceId === primary.sourceId && b.centroidLon === primary.centroidLon) return false;
    if (b === primary) return false;
    return b.footprintAreaSqFt >= 180 && b.footprintAreaSqFt <= Math.max(1500, (primary.footprintAreaSqFt || 0) * 0.45);
  });
  const accessoryIds = new Set(accessories.map((a) => a.sourceId + ":" + a.centroidLon));
  const labeled = scored.map((b) => {
    if (primary && b.centroidLon === primary.centroidLon && b.centroidLat === primary.centroidLat) return { ...b, role: "primary" as const };
    if (accessoryIds.has(b.sourceId + ":" + b.centroidLon)) return { ...b, role: "accessory" as const };
    if (b.onParcel) return { ...b, role: "accessory" as const };
    return { ...b, role: "neighbor" as const };
  });

  let confidence: StructureResolution["confidence"] = "low";
  let reason = "Could not confidently identify the home.";
  if (primary && parcel && primary.onParcel) {
    const second = pool[1];
    const gap = second ? primary.rankScore - second.rankScore : 99;
    if (primary.footprintAreaSqFt >= 700 && gap >= 18) {
      confidence = "high";
      reason = "Primary structure identified on the parcel.";
    } else {
      confidence = "moderate";
      reason = "Likely home identified; confirmation available.";
    }
  } else if (primary && primary.footprintAreaSqFt >= 700 && primary.distanceToAddressM < 40) {
    confidence = "moderate";
    reason = "No parcel polygon; nearest substantial structure used.";
  }

  return {
    primary,
    accessories: labeled.filter((b) => b.role === "accessory"),
    neighbors: labeled.filter((b) => b.role === "neighbor"),
    all: labeled.sort((a, b) => b.rankScore - a.rankScore),
    confidence,
    reason,
  };
}
