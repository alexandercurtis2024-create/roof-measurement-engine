import type { Feature, Polygon } from "geojson";
import { discoverElevation } from "../providers/elevation";
import { centroidLonLat, featurePerimeterFt } from "../geometry/geo";
import { recommendMaterials, runMeasurementEngine } from "../measurement/engine";
import { ALGORITHM_VERSION } from "../constants";

export async function analyzeBuilding(opts: {
  footprint: Feature<Polygon>;
  sourceName: string;
  sourceNotes: string;
  pitchRiseManual?: number | null;
  wasteOverride?: number | null;
}) {
  const c = centroidLonLat(opts.footprint);
  const elevation = await discoverElevation(c.lon, c.lat);
  const engine = runMeasurementEngine({
    footprint: opts.footprint,
    sourceName: opts.sourceName,
    sourceNotes: opts.sourceNotes,
    pitchRiseManual: opts.pitchRiseManual,
    wasteOverride: opts.wasteOverride,
    elevation,
  });
  const materials = recommendMaterials({
    surfaceAreaSqFt: engine.surfaceAreaSqFt,
    squares: engine.squares,
    perimeterFt: featurePerimeterFt(opts.footprint),
    waste: engine.wasteRecommended,
    bundlesPerSquare: 3,
    starterFtPerBundle: 105,
    ridgeCapFtPerBundle: 20,
    underlaymentSqPerRoll: 4,
    iceWaterSqFtPerRoll: 200,
    dripEdgeFtPerPiece: 10,
  });
  return { algorithmVersion: ALGORITHM_VERSION, elevation, engine, materials };
}
