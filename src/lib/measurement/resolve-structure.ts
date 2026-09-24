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

function ringOf(geom: Feature<Polygon> | Polygon | null | undefined): number[][] | null {
  if (!geom) return null;
  const coords = "geometry" in geom ? geom.geometry?.coordinates : (geom as Polygon).coordinates;
  const ring = coords?.[0];
  return Array.isArray(ring) ? (ring as number[][]) : null;
}

function pointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    const hit = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function onParcel(b: BuildingCandidate, parcel?: Feature<Polygon> | null) {
  const ring = ringOf(parcel || undefined);
  if (!ring) return false;
  return pointInRing(b.centroidLon, b.centroidLat, ring);
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
    let score = 0;
    if (inside) score += 90;
    else if (parcel) score -= 50;
    score += Math.max(0, 45 - dist / 2);
    if (area >= 800 && area <= 12000) score += 28;
    else if (area > 12000 && area <= 25000) score += 12;
    else if (area >= 180 && area < 800) score += 6;
    else if (area < 180) score -= 15;
    if (c.source.startsWith("md_imap")) score += 6;
    return {
      ...c,
      distanceToAddressM: dist,
      rankScore: score,
      rankReason: `${inside ? "on parcel" : parcel ? "off parcel" : "no parcel"} · ${Math.round(dist)} m · ${Math.round(area)} sq ft`,
      onParcel: inside,
      role: "unknown" as const,
    };
  }).sort((a, b) => b.rankScore - a.rankScore);

  const pool = parcel ? scored.filter((b) => b.onParcel) : scored;
  const use = pool.length ? pool : scored;
  const primary = use[0] || null;
  const accessories = use.filter((b) => primary && b !== primary && b.footprintAreaSqFt >= 180 && b.footprintAreaSqFt <= Math.max(1500, primary.footprintAreaSqFt * 0.45));
  const labeled = scored.map((b) => {
    if (primary && b.centroidLon === primary.centroidLon && b.centroidLat === primary.centroidLat) return { ...b, role: "primary" as const };
    if (accessories.some((a) => a.centroidLon === b.centroidLon && a.centroidLat === b.centroidLat)) return { ...b, role: "accessory" as const };
    if (b.onParcel) return { ...b, role: "accessory" as const };
    return { ...b, role: "neighbor" as const };
  });

  let confidence: StructureResolution["confidence"] = "low";
  let reason = "Could not confidently identify the home.";
  if (primary && primary.onParcel) {
    const gap = use[1] ? primary.rankScore - use[1].rankScore : 99;
    if (primary.footprintAreaSqFt >= 700 && gap >= 18) {
      confidence = "high";
      reason = "Primary structure identified on the parcel.";
    } else {
      confidence = "moderate";
      reason = "Likely home identified on the parcel.";
    }
  } else if (primary && primary.footprintAreaSqFt >= 700 && primary.distanceToAddressM < 40) {
    confidence = "moderate";
    reason = "Nearest substantial structure used.";
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
