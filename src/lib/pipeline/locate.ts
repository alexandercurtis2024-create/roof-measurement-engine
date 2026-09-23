import { geocodeAddress } from "../providers/address";
import { lookupParcel } from "../providers/parcel";
import { findBuildings } from "../providers/footprint";
import { rankBuildings } from "../measurement/rank";
import { jurisdictionFromCode } from "../providers/coverage";

export async function locateProperty(input: { street: string; city: string; state: string; zip?: string }) {
  const logs: string[] = [];
  const geocode = await geocodeAddress(input);
  logs.push(...geocode.warnings);
  if (!geocode.primary) {
    return { ok: false as const, error: "Address could not be geocoded.", logs, geocode };
  }
  const g = geocode.primary;
  logs.push(`Geocoded with ${g.provider}: ${g.matchedAddress} (${g.lat.toFixed(6)}, ${g.lon.toFixed(6)})`);

  const parcel = await lookupParcel(g.lon, g.lat);
  if (parcel) logs.push(`Parcel ${parcel.parcelId || "unknown"} via ${parcel.provider}`);
  else logs.push("No parcel record found at this coordinate.");

  const footprints = await findBuildings(g.lon, g.lat);
  logs.push(...footprints.warnings);
  const ranked = rankBuildings(footprints.candidates, { lon: g.lon, lat: g.lat });
  logs.push(`Building candidates: ${ranked.length}`);

  const juris = jurisdictionFromCode(parcel?.jurisdictionCode);
  const coverage = ranked.length === 0 ? "manual_review_likely" : "partial";

  return {
    ok: true as const,
    logs,
    geocode: g,
    geocodeFallbacks: geocode.fallbacks,
    parcel,
    buildings: ranked,
    jurisdiction: juris,
    coverage,
  };
}
