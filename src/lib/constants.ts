export const ALGORITHM_VERSION = "0.1.0";
/** Frozen LiDAR area/pitch engine. Separate from footprint+manual-pitch v0.1.0. */
export const LIDAR_ENGINE_VERSION = "v1.0.0-cand";
export const LIDAR_VALIDATION = {
  nRoofs: 2,
  medianAbsAreaPct: 1.1,
  worstAbsAreaPct: 1.37,
  within3pct: "2/2",
  pitchWithinOneStep: "2/2",
  reports: ["EagleView 72480732", "EagleView 72558723"],
} as const;

export const ORIGIN = {
  MEASURED: "measured",
  DERIVED: "derived",
  ESTIMATED: "estimated",
  UNAVAILABLE: "unavailable",
  MANUAL: "manual",
} as const;

export type Origin = (typeof ORIGIN)[keyof typeof ORIGIN];

export const CONFIDENCE = {
  HIGH: "high",
  MODERATE: "moderate",
  LOW: "low",
  MANUAL: "manual_verification_required",
  UNAVAILABLE: "unavailable",
} as const;

export type Confidence = (typeof CONFIDENCE)[keyof typeof CONFIDENCE];

export const JOB_STAGES = [
  "queued",
  "address_validation",
  "property_located",
  "footprint_retrieved",
  "elevation_data_located",
  "acquiring_lidar",
  "processing_lidar",
  "reconstructing_roof",
  "calculating_measurements",
  "geometry_reconstructed",
  "edges_classified",
  "measurements_calculated",
  "confidence_calculated",
  "needs_review",
  "report_prepared",
  "complete",
  "failed",
] as const;

export type JobStage = (typeof JOB_STAGES)[number];
