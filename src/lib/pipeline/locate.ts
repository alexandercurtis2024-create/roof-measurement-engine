import { geocodeAddress } from "../providers/address";
import { lookupParcel } from "../providers/parcel";
import { findBuildings } from "../providers/footprint";
import { resolveStructures } from "../measurement/resolve-structure";
import { jurisdictionFromCode } from "../providers/coverage";

export async function locateProperty(input: { street: string; city: string; state: string; zip?: string }) {
  const logs: string[] = [];
  const geocode = await geocodeAddress(input);
  logs.push(...geocode.warnings);
  if (!geocode.primary) {
    return { ok: false as const, error: "Address could not be geocoded.", logs, geocode };
  }
  const g = geocode.primary;
  logs.push(`Geocoded with ${g.provider}: ${g.matchedAddress}`);

  const parcel = await lookupParcel(g.lon, g.lat);
  if (parcel) logs.push(`Parcel ${parcel.parcelId || "unknown"} via ${parcel.provider}`);
  else logs.push("No parcel record found at this coordinate.");

  const footprints = await findBuildings(g.lon, g.lat);
  logs.push(...footprints.warnings);
  const resolved = resolveStructures(footprints.candidates, { lon: g.lon, lat: g.lat }, parcel?.geometry || null);
  logs.push(resolved.reason);
  logs.push(`Buildings: ${resolved.all.length}. Primary ${resolved.primary ? Math.round(resolved.primary.footprintAreaSqFt) + " sq ft" : "none"}. Confidence ${resolved.confidence}.`);

  const juris = jurisdictionFromCode(parcel?.jurisdictionCode);
  return {
    ok: true as const,
    logs,
    geocode: g,
    geocodeFallbacks: geocode.fallbacks,
    parcel,
    buildings: resolved.all,
    resolution: resolved,
    jurisdiction: juris,
    coverage: resolved.primary ? "partial" : "manual_review_likely",
  };
}
