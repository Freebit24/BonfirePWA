"use client";

import { memo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Ensure Leaflet marker icons load correctly in Next.js
// Reuse the same assets placed under public/app/leaflet
// Note: This mirrors the fix used in other map components
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "/app/leaflet/marker-icon-2x.png",
  iconUrl: "/app/leaflet/marker-icon.png",
  shadowUrl: "/app/leaflet/marker-icon-shadow.png",
});

export interface MapPreviewProps {
  lat: number;
  lng: number;
  className?: string;
  // Height/width should be controlled by the parent via CSS classes
  zoom?: number; // default 15
  interactive?: boolean; // default false
}

function MapPreviewInner({ lat, lng, className, zoom = 15, interactive = false }: MapPreviewProps) {
  // Use a static, minimal map intended as a preview. Optionally interactive if needed.
  return (
    <div className={className}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        dragging={interactive}
        attributionControl={true}
        style={{ background: "#0b0b10" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
    </div>
  );
}

export const MapPreview = memo(MapPreviewInner);
