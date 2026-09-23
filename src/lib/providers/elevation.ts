import { fetchJson, qs } from "./http";
import type { ElevationSample, LidarDiscovery } from "./types";

export async function sampleUsgsEpqs(lon: number, lat: number): Promise<ElevationSample | null> {
  const url = "https://epqs.nationalmap.gov/v1/json?" + qs({ x: lon, y: lat, units: "Feet", wkid: 4326, includeDate: "true" });
  const res = await fetchJson<{ value?: number | string; resolution?: number; attributes?: { AcquisitionDate?: string } }>(url);
  if (!res.data || res.data.value === undefined) return null;
  const value = Number(res.data.value);
  if (!Number.isFinite(value) || value < -1000) return null;
  return {
    provider: "usgs_epqs",
    dataset: "USGS 3DEP Elevation Point Query Service",
    lon, lat, elevation: value, units: "feet",
    resolution: res.data.resolution ? `${res.data.resolution} m` : undefined,
    acquisitionDate: res.data.attributes?.AcquisitionDate,
    raw: res.data as Record<string, unknown>,
  };
}

export async function sampleMarylandDem(lon: number, lat: number): Promise<ElevationSample | null> {
  const url = "https://mdgeodata.md.gov/lidar/rest/services/Statewide/MD_statewide_dem_m/ImageServer/identify?" +
    qs({ geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }), geometryType: "esriGeometryPoint", returnGeometry: "false", f: "json" });
  const res = await fetchJson<{ value?: string | number }>(url);
  if (res.data?.value === undefined || res.data.value === "NoData") return null;
  const meters = Number(res.data.value);
  if (!Number.isFinite(meters)) return null;
  return {
    provider: "md_imap_lidar",
    dataset: "MD iMAP Statewide DEM (bare earth)",
    lon, lat, elevation: meters * 3.280839895, units: "feet",
    resolution: "county mosaic",
    raw: res.data as Record<string, unknown>,
  };
}

export async function discoverUsgsLidar(lon: number, lat: number): Promise<LidarDiscovery[]> {
  const d = 0.01;
  const url = "https://tnmaccess.nationalmap.gov/api/v1/products?" +
    qs({ datasets: "Lidar Point Cloud (LPC)", bbox: `${lon - d},${lat - d},${lon + d},${lat + d}`, max: 8 });
  const res = await fetchJson<{ items?: Array<{ title?: string; downloadURL?: string; format?: string; sizeInBytes?: number }> }>(url, {}, 20000);
  return (res.data?.items ?? []).map((item) => ({
    provider: "usgs_tnm",
    dataset: item.title || "USGS LPC",
    title: item.title || "USGS Lidar Point Cloud",
    downloadUrl: item.downloadURL,
    sizeBytes: item.sizeInBytes,
    format: item.format,
    notes: "Full LAZ tiles are large. v0.1 records availability and does not download tiles in the web request.",
  }));
}

export async function discoverElevation(lon: number, lat: number) {
  const [epqs, mdDem, lidar] = await Promise.all([
    sampleUsgsEpqs(lon, lat).catch(() => null),
    sampleMarylandDem(lon, lat).catch(() => null),
    discoverUsgsLidar(lon, lat).catch(() => [] as LidarDiscovery[]),
  ]);
  return {
    groundSamples: [epqs, mdDem].filter(Boolean) as ElevationSample[],
    lidar,
    limitations: [
      "USGS EPQS and MD iMAP DEM expose bare-earth surfaces, not roof DSMs.",
      "Roof pitch cannot be computed from bare-earth DEM samples.",
      "3D facet reconstruction requires cropped LiDAR point clouds, processed outside the web request.",
    ],
  };
}
