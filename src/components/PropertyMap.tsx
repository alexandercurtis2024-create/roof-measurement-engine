"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, useMap } from "react-leaflet";
import type { Feature, Polygon as GJPolygon } from "geojson";
import "leaflet/dist/leaflet.css";

function Fit({ positions }: { positions: [number, number][][] }) {
  const map = useMap();
  useEffect(() => {
    const flat = positions.flat();
    if (!flat.length) return;
    const lats = flat.map((p) => p[0]);
    const lons = flat.map((p) => p[1]);
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [28, 28] });
  }, [map, positions]);
  return null;
}
function ringsFrom(geom: Feature<GJPolygon> | GJPolygon | null | undefined): [number, number][] {
  if (!geom) return [];
  const coords = "geometry" in geom ? geom.geometry.coordinates : geom.coordinates;
  return (coords?.[0] ?? []).map(([lon, lat]) => [lat, lon] as [number, number]);
}
export function PropertyMap({ lat, lon, parcel, buildings, selectedId, onSelect }: {
  lat: number; lon: number; parcel?: Feature<GJPolygon> | null;
  buildings: Array<{ id: string; geometry: Feature<GJPolygon>; selected?: boolean }>;
  selectedId?: string | null; onSelect?: (id: string) => void;
}) {
  const parcelRing = ringsFrom(parcel || undefined);
  const buildingRings = buildings.map((b) => ({ id: b.id, ring: ringsFrom(b.geometry), selected: b.id === selectedId || b.selected }));
  const all = [parcelRing, ...buildingRings.map((b) => b.ring)].filter((r) => r.length);
  return (
    <div className="h-72 overflow-hidden rounded-2xl ring-1 ring-black/10 sm:h-96">
      <MapContainer center={[lat, lon]} zoom={19} className="h-full w-full" zoomControl scrollWheelZoom>
        <TileLayer attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
        {all.length ? <Fit positions={all} /> : null}
        {parcelRing.length ? <Polygon positions={parcelRing} pathOptions={{ color: "#f4efe6", weight: 1, dashArray: "4 4", fillOpacity: 0.05 }} /> : null}
        {buildingRings.map((b) => (
          <Polygon key={b.id} positions={b.ring} eventHandlers={{ click: () => onSelect?.(b.id) }} pathOptions={{ color: b.selected ? "#c46a2b" : "#f8f4ee", weight: b.selected ? 3 : 2, fillColor: b.selected ? "#c46a2b" : "#ffffff", fillOpacity: b.selected ? 0.35 : 0.15 }} />
        ))}
        <CircleMarker center={[lat, lon]} radius={6} pathOptions={{ color: "#fff", fillColor: "#141921", fillOpacity: 1, weight: 2 }} />
      </MapContainer>
    </div>
  );
}
