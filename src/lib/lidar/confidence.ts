import { CONFIDENCE } from "@/lib/constants";

export function lidarConfidence(input: {
  roofPoints: number;
  unexplained: number;
  facetCount: number;
  meanRmse?: number | null;
  areaSqFt: number | null;
}): { level: string; reason: string } {
  if (!input.areaSqFt || input.areaSqFt < 200 || input.roofPoints < 80 || input.facetCount < 1) {
    return { level: CONFIDENCE.UNAVAILABLE, reason: "Insufficient LiDAR roof support." };
  }
  const unexplainedFrac = input.roofPoints ? input.unexplained / input.roofPoints : 1;
  const rmse = input.meanRmse ?? 0.2;
  if (input.roofPoints >= 800 && unexplainedFrac < 0.08 && rmse < 0.12 && input.facetCount >= 2) {
    return { level: CONFIDENCE.HIGH, reason: "Dense roof points, low residual, complete facet set." };
  }
  if (input.roofPoints >= 250 && unexplainedFrac < 0.2 && rmse < 0.22) {
    return { level: CONFIDENCE.MODERATE, reason: "Usable support; review recommended." };
  }
  return { level: CONFIDENCE.LOW, reason: "Thin support or high leftover fraction; manual verification required." };
}
