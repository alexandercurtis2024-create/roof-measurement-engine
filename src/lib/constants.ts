export const ALGORITHM_VERSION = "0.1.0";

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
