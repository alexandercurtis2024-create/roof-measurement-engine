import type { Feature, Polygon } from "geojson";
import {
  featureAreaSqFt,
  featurePerimeterFt,
  formatPitch,
  lineLengthFt,
  polygonEdges,
  slopedAreaFromFootprint,
  slopeDegreesFromPitch,
} from "../geometry/geo";
import { ALGORITHM_VERSION, CONFIDENCE, ORIGIN } from "../constants";
import type { ElevationSample, LidarDiscovery } from "../providers/types";

export type EngineInput = {
  footprint: Feature<Polygon>;
  sourceName: string;
  sourceNotes: string;
  pitchRiseManual?: number | null;
  wasteOverride?: number | null;
  elevation?: { samples: ElevationSample[]; lidar: LidarDiscovery[]; limitations: string[] };
};

export type MeasurementRow = {
  key: string; label: string; value: number | null; unit: string | null; display: string;
  origin: string; confidence: string; method: string; sources: string; notes?: string;
};

export function runMeasurementEngine(input: EngineInput) {
  const footprintArea = featureAreaSqFt(input.footprint);
  const perimeter = featurePerimeterFt(input.footprint);
  const edges = polygonEdges(input.footprint);
  const hasManualPitch = input.pitchRiseManual !== null && input.pitchRiseManual !== undefined && input.pitchRiseManual >= 0;
  const slopeDeg = hasManualPitch ? slopeDegreesFromPitch(input.pitchRiseManual!) : null;
  const surface = slopeDeg !== null ? slopedAreaFromFootprint(footprintArea, slopeDeg) : null;
  const squares = surface !== null ? surface / 100 : null;
  const compact = perimeter / Math.sqrt(Math.max(footprintArea, 1));
  let waste = 0.1;
  let wasteReason = "Simple single-polygon footprint.";
  if (compact > 18) { waste = 0.15; wasteReason = "Irregular footprint increases cut waste."; }
  else if (compact > 15) { waste = 0.12; wasteReason = "Moderately irregular footprint."; }
  waste = input.wasteOverride ?? waste;

  const measurements: MeasurementRow[] = [
    { key: "footprint_area", label: "Roof footprint area", value: footprintArea, unit: "sq ft", display: `${footprintArea.toFixed(0)} sq ft`, origin: ORIGIN.MEASURED, confidence: input.sourceName.includes("microsoft") ? CONFIDENCE.LOW : CONFIDENCE.MODERATE, method: "Geodesic polygon area of selected building footprint (WGS84).", sources: input.sourceName, notes: "Plan-view area, not sloped surface area." },
    { key: "surface_area", label: "Roof surface area", value: surface, unit: "sq ft", display: surface ? `${surface.toFixed(0)} sq ft` : "Unavailable", origin: surface ? ORIGIN.DERIVED : ORIGIN.UNAVAILABLE, confidence: surface ? CONFIDENCE.MODERATE : CONFIDENCE.UNAVAILABLE, method: surface ? "footprint / cos(pitch) using contractor-entered pitch" : "Requires pitch from LiDAR planes or a manual pitch entry", sources: input.sourceName },
    { key: "squares", label: "Roofing squares", value: squares, unit: "squares", display: squares ? squares.toFixed(2) : "Unavailable", origin: squares ? ORIGIN.DERIVED : ORIGIN.UNAVAILABLE, confidence: squares ? CONFIDENCE.MODERATE : CONFIDENCE.UNAVAILABLE, method: "surface area / 100", sources: "Derived" },
    { key: "pitch", label: "Pitch", value: hasManualPitch ? input.pitchRiseManual! : null, unit: "/12", display: hasManualPitch ? formatPitch(input.pitchRiseManual!) : "Unavailable — no roof surface model", origin: hasManualPitch ? ORIGIN.MANUAL : ORIGIN.UNAVAILABLE, confidence: hasManualPitch ? CONFIDENCE.MANUAL : CONFIDENCE.UNAVAILABLE, method: hasManualPitch ? "Contractor-entered rise/12. Not computed from elevation." : "Bare-earth DEM cannot produce roof pitch.", sources: hasManualPitch ? "Manual entry" : "No DSM / LiDAR planes" },
    { key: "perimeter", label: "Footprint perimeter", value: perimeter, unit: "ft", display: `${perimeter.toFixed(1)} ft`, origin: ORIGIN.MEASURED, confidence: CONFIDENCE.MODERATE, method: "Sum of geodesic 2D footprint edge lengths.", sources: input.sourceName },
    { key: "ridge", label: "Ridge length", value: null, unit: "ft", display: "Unavailable", origin: ORIGIN.UNAVAILABLE, confidence: CONFIDENCE.UNAVAILABLE, method: "Requires opposing plane intersections.", sources: "Not computed without LiDAR facets" },
    { key: "hip", label: "Hip length", value: null, unit: "ft", display: "Unavailable", origin: ORIGIN.UNAVAILABLE, confidence: CONFIDENCE.UNAVAILABLE, method: "Requires convex plane intersections.", sources: "Not computed without LiDAR facets" },
    { key: "valley", label: "Valley length", value: null, unit: "ft", display: "Unavailable", origin: ORIGIN.UNAVAILABLE, confidence: CONFIDENCE.UNAVAILABLE, method: "Requires concave plane intersections.", sources: "Not computed without LiDAR facets" },
    { key: "eave", label: "Eave length", value: null, unit: "ft", display: "Unclassified", origin: ORIGIN.UNAVAILABLE, confidence: CONFIDENCE.UNAVAILABLE, method: "Perimeter exists; eave vs rake cannot be labeled without plane tilt.", sources: "Footprint perimeter only" },
    { key: "rake", label: "Rake length", value: null, unit: "ft", display: "Unclassified", origin: ORIGIN.UNAVAILABLE, confidence: CONFIDENCE.UNAVAILABLE, method: "Requires sloped gable-end identification.", sources: "Not computed without LiDAR facets" },
    { key: "waste", label: "Waste recommendation", value: waste, unit: "fraction", display: `${Math.round(waste * 100)}%`, origin: ORIGIN.ESTIMATED, confidence: CONFIDENCE.LOW, method: wasteReason + " Recommendation only.", sources: "Complexity heuristic v0.1" },
  ];

  const ground = input.elevation?.samples?.[0];
  if (ground) {
    measurements.push({
      key: "site_elevation", label: "Site ground elevation", value: ground.elevation, unit: "ft",
      display: `${ground.elevation.toFixed(1)} ft (${ground.dataset})`, origin: ORIGIN.MEASURED, confidence: CONFIDENCE.MODERATE,
      method: "Point sample of bare-earth elevation at the building centroid.", sources: `${ground.provider} · ${ground.dataset}`,
      notes: ground.acquisitionDate ? `Acquisition: ${ground.acquisitionDate}` : undefined,
    });
  }

  return {
    algorithmVersion: ALGORITHM_VERSION,
    method: hasManualPitch ? "2D footprint + contractor pitch (single-plane assumption)" : "2D footprint measurement only. 3D reconstruction unavailable.",
    footprintAreaSqFt: footprintArea,
    surfaceAreaSqFt: surface,
    squares,
    pitchRise: hasManualPitch ? input.pitchRiseManual! : null,
    pitchDisplay: hasManualPitch ? formatPitch(input.pitchRiseManual!) : "Unavailable",
    complexityClass: waste >= 0.15 ? "Moderate" : "Simple / unknown 3D",
    complexityReason: "Complexity is footprint-based in v0.1. Valleys, hips, and dormers are not detected automatically.",
    wasteRecommended: waste,
    measurements,
    facets: [{
      code: "F1", geometry: input.footprint, slopeDegrees: slopeDeg,
      pitchRise: hasManualPitch ? input.pitchRiseManual! : null, surfaceAreaSqFt: surface,
      footprintAreaSqFt: footprintArea, origin: hasManualPitch ? ORIGIN.DERIVED : ORIGIN.MEASURED,
      confidence: hasManualPitch ? CONFIDENCE.MODERATE : CONFIDENCE.LOW,
      notes: hasManualPitch ? "Single-facet placeholder using contractor pitch." : "Facet split requires LiDAR planes or manual editor.",
    }],
    edges: edges.map((e, i) => ({
      code: `E${i + 1}`, type: "unclassified" as const, geometry: e, lengthFt: lineLengthFt(e),
      origin: ORIGIN.MEASURED, confidence: CONFIDENCE.MODERATE,
      method: "2D footprint segment. Type unclassified without 3D plane adjacency.",
    })),
    limitations: [
      ...(input.elevation?.limitations ?? []),
      "Edge types unclassified until opposing planes can be reconstructed.",
      input.sourceNotes,
    ],
  };
}

export function recommendMaterials(opts: {
  surfaceAreaSqFt: number | null; squares: number | null; perimeterFt: number; waste: number;
  bundlesPerSquare: number; starterFtPerBundle: number; ridgeCapFtPerBundle: number;
  underlaymentSqPerRoll: number; iceWaterSqFtPerRoll: number; dripEdgeFtPerPiece: number;
}) {
  if (!opts.surfaceAreaSqFt || !opts.squares) {
    return { available: false, note: "Material quantities require sloped surface area. Enter pitch or wait for LiDAR reconstruction.", lines: [] as Array<{ item: string; qty: number | null; unit: string; basis: string; origin: string }> };
  }
  const areaWithWaste = opts.surfaceAreaSqFt * (1 + opts.waste);
  const squaresWithWaste = areaWithWaste / 100;
  return {
    available: true,
    note: "Estimates from measured footprint and derived surface area. Ridge cap omitted because ridge/hip lengths are unavailable.",
    lines: [
      { item: "Shingles", qty: Math.ceil(squaresWithWaste * opts.bundlesPerSquare), unit: "bundles", basis: `${squaresWithWaste.toFixed(2)} squares incl. waste`, origin: "derived" },
      { item: "Underlayment", qty: Math.ceil(squaresWithWaste / opts.underlaymentSqPerRoll), unit: "rolls", basis: "squares incl. waste / roll coverage", origin: "derived" },
      { item: "Starter", qty: Math.ceil(opts.perimeterFt / opts.starterFtPerBundle), unit: "bundles", basis: "perimeter / starter coverage", origin: "estimated" },
      { item: "Drip edge", qty: Math.ceil(opts.perimeterFt / opts.dripEdgeFtPerPiece), unit: "pieces", basis: "perimeter / piece length", origin: "estimated" },
      { item: "Ice & water barrier", qty: Math.ceil((opts.perimeterFt * 6) / opts.iceWaterSqFtPerRoll), unit: "rolls", basis: "6 ft band × full 2D perimeter (assumption)", origin: "estimated" },
      { item: "Ridge cap", qty: null, unit: "bundles", basis: "Ridge and hip lengths unavailable", origin: "unavailable" },
    ],
  };
}
