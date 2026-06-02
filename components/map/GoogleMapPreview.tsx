"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/components/ui/location-autocomplete";

declare global {
  interface Window { google: any }
}

export interface GoogleMapPreviewProps {
  lat: number;
  lng: number;
  className?: string; // control size via Tailwind classes
  zoom?: number; // default 15
  clickable?: boolean; // if true, map allows pan/zoom. default false
  marker?: boolean; // show marker at center (default true)
}

const PREVIEW_STYLE: any[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text", stylers: [{ visibility: "simplified" }] },
];

export function GoogleMapPreview({ lat, lng, className, zoom = 15, clickable = false, marker = true }: GoogleMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const pinRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (!isMounted || !containerRef.current || !(window as any).google?.maps) return;
        const google = (window as any).google;

        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat, lng },
          zoom,
          disableDefaultUI: true,
          draggable: clickable,
          scrollwheel: clickable,
          disableDoubleClickZoom: !clickable,
          gestureHandling: clickable ? "greedy" : "none",
          clickableIcons: false,
          styles: PREVIEW_STYLE,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        } as any);

        if (marker) {
          pinRef.current = new google.maps.Marker({
            position: { lat, lng },
            map: mapRef.current,
          });
        }
      } catch (e) {
        // swallow errors; if Google fails to load, preview just stays blank
        console.warn("GoogleMapPreview failed to init", e);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (pinRef.current) {
        pinRef.current.setMap(null);
        pinRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [lat, lng, zoom, clickable, marker]);

  // Keep marker position synced if props change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setCenter({ lat, lng });
    }
    if (pinRef.current) {
      pinRef.current.setPosition({ lat, lng });
    }
  }, [lat, lng]);

  return <div ref={containerRef} className={className} />;
}
