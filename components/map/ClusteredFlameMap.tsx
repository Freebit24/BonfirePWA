// components/ClusteredFlameMap.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import supercluster from 'supercluster';
import { point as turfPoint } from '@turf/helpers';
import 'leaflet/dist/leaflet.css';
import type { Event } from '@/types';

type UserLocation = { latitude: number; longitude: number } | null;

/* ---------- Recenter helper ---------- */
function RecenterOnLocation({
  userLocation,
  behavior = 'once',
  minZoom = 14,
}: {
  userLocation: UserLocation;
  behavior?: 'once' | 'follow';
  minZoom?: number;
}) {
  const map = useMap();
  const didCenterRef = useRef(false);
  const lastLatRef = useRef<number | null>(null);
  const lastLngRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userLocation) return;

    const { latitude, longitude } = userLocation;
    if (
      lastLatRef.current !== null &&
      lastLngRef.current !== null &&
      Math.abs(lastLatRef.current - latitude) < 1e-5 &&
      Math.abs(lastLngRef.current - longitude) < 1e-5
    ) return;

    if (behavior === 'once' && didCenterRef.current) return;

    const targetZoom = Math.max(map.getZoom?.() ?? minZoom, minZoom);
    map.setView([latitude, longitude], targetZoom, { animate: true });

    lastLatRef.current = latitude;
    lastLngRef.current = longitude;
    didCenterRef.current = true;
  }, [userLocation, behavior, minZoom, map]);

  return null;
}

/* ---------- Icon creation helper ---------- */
function flameDivIcon(id: string, size: number, badgeText?: number) {
  const s = Math.round(size);
  const badge =
    typeof badgeText === 'number'
      ? `<div style="position:absolute;right:-4px;top:-6px;min-width:22px;height:22px;border-radius:9999px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3)">${badgeText}</div>`
      : '';
  return L.divIcon({
    className: 'flame-icon',
    iconSize: [s, s],
    iconAnchor: [s / 2, s - 6],
    html: `
      <div style="position:relative;width:${s}px;height:${s}px">
        ${badge}
        <img 
          src="/flame-icon.png" 
          alt="flame" 
          style="width:${s}px;height:${s}px;object-fit:contain;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 0 12px rgba(255,140,0,0.6)) drop-shadow(0 0 20px rgba(255,69,0,0.4));" 
        />
      </div>
    `,
  });
}

/* ---------- Clustering ---------- */
function useClusters(events: Event[], zoom: number, bounds: L.LatLngBounds) {
  const index = useMemo(() => {
    const pts = events
      .filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number')
      .map((e) => turfPoint([e.longitude, e.latitude], { id: e.id, title: e.title }));
    return new supercluster({ radius: 60, maxZoom: 18, minPoints: 2 }).load(pts as any);
  }, [events]);

  const bbox: [number, number, number, number] = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ];

  const clusters = useMemo(
    () => index.getClusters(bbox as any, Math.round(zoom)),
    [index, bbox, zoom]
  );

  return { index, clusters };
}

/* ---------- Map content ---------- */
function MapContent({
  events,
  onEventClick,
  userLocation,
}: {
  events: Event[];
  onEventClick: (e: Event) => void;
  userLocation: UserLocation;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());
  const [bounds, setBounds] = useState<L.LatLngBounds>(map.getBounds());
  const { index, clusters } = useClusters(events, zoom, bounds);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const onMove = () => {
      // Debounce to avoid excessive cluster recalculations during fast panning
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setZoom(map.getZoom());
        setBounds(map.getBounds());
      }, 100);
    };
    map.on('moveend', onMove);
    return () => {
      clearTimeout(debounceTimer);
      map.off('moveend', onMove);
    };
  }, [map]);

  return (
    <>
      {clusters.map((c: any) => {
        const [lng, lat] = c.geometry.coordinates;

        if (c.properties.cluster) {
          const count = c.properties.point_count as number;
          const size = Math.min(100, 50 + Math.log2(count + 1) * 14);
          const id = `cluster-${c.properties.cluster_id}`;
          const icon = flameDivIcon(id, size, count);

          return (
            <Marker
              key={`${id}-${Math.round(zoom)}`}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    index.getClusterExpansionZoom(c.properties.cluster_id),
                    18
                  );
                  map.setView([lat, lng], expansionZoom, { animate: true });
                },
              }}
            />
          );
        }

        const ev = events.find((e) => e.id === c.properties.id);
        if (!ev) return null;

        const id = `event-${ev.id}`;
        const icon = flameDivIcon(id, 64);

        return (
          <Marker
            key={`${id}-${Math.round(zoom)}`}
            position={[ev.latitude as number, ev.longitude as number]}
            icon={icon}
            ref={(markerRef) => {
              if (markerRef) {
                markerRefs.current.set(ev.id, markerRef);
              }
            }}
            eventHandlers={{
              mouseover: (e) => {
                e.target.openPopup();
              },
              mouseout: (e) => {
                // Close popup only if mouse leaves both marker and popup
                const popupElement = e.target.getPopup()?.getElement();
                if (popupElement) {
                  popupElement.addEventListener('mouseenter', () => {
                    e.target.openPopup();
                  });
                  popupElement.addEventListener('mouseleave', () => {
                    e.target.closePopup();
                  });
                }
                e.target.closePopup();
              },
              click: () => onEventClick(ev),
            }}
          >
            <Popup autoClose={false} closeOnClick={false} closeButton={false}>
              <div className="p-3 min-w-64" onMouseEnter={() => {
                const marker = markerRefs.current.get(ev.id);
                if (marker) marker.openPopup();
              }} onMouseLeave={() => {
                const marker = markerRefs.current.get(ev.id);
                if (marker) marker.closePopup();
              }}>
                <div className="font-semibold text-lg mb-2">{ev.title}</div>
                {ev.description && (
                  <div className="text-sm text-gray-600 mb-2 line-clamp-2">{ev.description}</div>
                )}
                <div className="text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span>📍</span>
                    <span>{ev.location}</span>
                  </div>
                  {ev.date && ev.time && (
                    <div className="flex items-center gap-1">
                      <span>🕐</span>
                      <span>{ev.date} at {ev.time}</span>
                    </div>
                  )}
                </div>
                <button
                  className="w-full px-3 py-2 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 transition"
                  onClick={() => onEventClick(ev)}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={L.divIcon({
            className: 'user-loc',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            html: `<div style="width:22px;height:22px;border-radius:9999px;background:#007aff;box-shadow:0 0 0 6px rgba(0,122,255,.15);cursor:pointer"></div>`,
          })}
          eventHandlers={{
            click: () => {
              if (zoom < 15) {
                map.setView([userLocation.latitude, userLocation.longitude], 15, { animate: true });
              }
            },
            mouseover: (e) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              // Only show popup if not already zoomed in
              if (zoom < 15) {
                hoverTimeoutRef.current = setTimeout(() => {
                  e.target.openPopup();
                }, 1000);
              }
            },
            mouseout: (e) => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              e.target.closePopup();
            },
          }}
        >
          <Popup closeButton={false} autoClose={false} closeOnClick={false}>
            <div className="p-2 text-center">
              <div className="font-semibold text-blue-600">Your Location</div>
              <div className="text-sm text-gray-600 mt-1">Click to zoom in</div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}

/* ---------- Exported clustered map ---------- */
export default function ClusteredFlameMap({
  events,
  onEventClick,
  userLocation,
  height = 600,
  initialCenter = [12.9716, 77.5946] as [number, number],
  initialZoom = 12,
  recenterBehavior = 'once',
}: {
  events: Event[];
  onEventClick: (e: Event) => void;
  userLocation: UserLocation;
  height?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
  recenterBehavior?: 'once' | 'follow';
}) {
  return (
    <div style={{ 
      height, 
      width: '100%', 
      borderRadius: 12, 
      overflow: 'hidden',
      contain: 'layout style paint',
      willChange: 'contents',
    }}>
      <MapContainer 
        center={initialCenter} 
        zoom={initialZoom} 
        className="h-full w-full"
        preferCanvas={false}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <RecenterOnLocation userLocation={userLocation} behavior={recenterBehavior} minZoom={14} />
        <MapContent events={events} onEventClick={onEventClick} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}