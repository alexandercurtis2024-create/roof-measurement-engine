import type { BuildingCandidate } from "../providers/types";
import { distanceMeters } from "../geometry/geo";

export function rankBuildings(
  candidates: BuildingCandidate[],
  address: { lon: number; lat: number },
) {
  return candidates
    .map((c) => {
      const dist = distanceMeters({ lon: c.centroidLon, lat: c.centroidLat }, address);
      const area = c.footprintAreaSqFt;
      let score = 0;
      score += Math.max(0, 80 - dist);
      if (area >= 600 && area <= 8000) score += 25;
      else if (area > 8000 && area <= 20000) score += 15;
      else if (area >= 120 && area < 600) score += 5;
      if (c.source.startsWith("md_imap")) score += 8;
      const reasons = [
        `${Math.round(dist)} m from address point`,
        `${Math.round(area)} sq ft footprint`,
        c.source,
      ];
      return { ...c, distanceToAddressM: dist, rankScore: score, rankReason: reasons.join(" · ") };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}
