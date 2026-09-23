import { fetchJson, qs } from "./http";
import type { GeocodeResult } from "./types";

type CensusResponse = {
  result?: {
    addressMatches?: Array<{
      matchedAddress: string;
      coordinates: { x: number; y: number };
      addressComponents: { zip: string; city: string; state: string; streetName: string };
      tigerLine?: { tigerLineId: string; side: string };
    }>;
  };
};

export async function geocodeCensus(input: {
  street: string; city: string; state: string; zip?: string;
}): Promise<GeocodeResult | null> {
  const url = "https://geocoding.geo.census.gov/geocoder/locations/address?" +
    qs({ street: input.street, city: input.city, state: input.state, zip: input.zip, benchmark: "Public_AR_Current", format: "json" });
  const res = await fetchJson<CensusResponse>(url, {}, 15000);
  const match = res.data?.result?.addressMatches?.[0];
  if (!match) return null;
  const comps = match.addressComponents;
  return {
    provider: "census_geocoder",
    matchedAddress: match.matchedAddress,
    street: input.street,
    city: comps.city,
    state: comps.state,
    zip: comps.zip,
    lon: match.coordinates.x,
    lat: match.coordinates.y,
    quality: "address_range_interpolated",
    confidence: 0.78,
    metadata: { benchmark: "Public_AR_Current", tigerLine: match.tigerLine ?? null, attribution: "U.S. Census Bureau Geocoding Services" },
  };
}

export async function geocodeNominatim(input: {
  street: string; city: string; state: string; zip?: string;
}): Promise<GeocodeResult | null> {
  const q = [input.street, input.city, input.state, input.zip, "USA"].filter(Boolean).join(", ");
  const url = "https://nominatim.openstreetmap.org/search?" +
    qs({ q, format: "jsonv2", addressdetails: 1, limit: 1, countrycodes: "us" });
  const res = await fetchJson<Array<{ lat: string; lon: string; display_name: string; type?: string; importance?: number; address?: Record<string, string>; class?: string }>>(
    url, { headers: { Referer: "https://roof-measurement-engine.vercel.app" } }, 15000,
  );
  const hit = Array.isArray(res.data) ? res.data[0] : null;
  if (!hit) return null;
  return {
    provider: "nominatim",
    matchedAddress: hit.display_name,
    street: input.street,
    city: hit.address?.city || hit.address?.town || input.city,
    state: hit.address?.state || input.state,
    zip: hit.address?.postcode || input.zip,
    lon: Number(hit.lon),
    lat: Number(hit.lat),
    quality: hit.type || "place",
    confidence: Math.min(0.72, (hit.importance ?? 0.4) + 0.2),
    metadata: { attribution: "© OpenStreetMap contributors, Nominatim", osmClass: hit.class, osmType: hit.type },
  };
}

export async function geocodeAddress(input: { street: string; city: string; state: string; zip?: string }) {
  const warnings: string[] = [];
  const fallbacks: GeocodeResult[] = [];
  const census = await geocodeCensus(input);
  if (census) {
    const nom = await geocodeNominatim(input);
    if (nom) fallbacks.push(nom);
    return { primary: census, fallbacks, warnings };
  }
  warnings.push("Census Bureau geocoder returned no address match.");
  const nom = await geocodeNominatim(input);
  if (nom) {
    warnings.push("Using Nominatim fallback. Confirm the pin before measuring.");
    return { primary: nom, fallbacks, warnings };
  }
  warnings.push("No geocoder could locate this address.");
  return { primary: null, fallbacks, warnings };
}
