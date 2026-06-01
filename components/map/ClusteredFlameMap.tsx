// components/ClusteredFlameMap.tsx
'use client';

import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import supercluster from 'supercluster';
import { point as turfPoint } from '@turf/helpers';
import 'leaflet/dist/leaflet.css';
import type { Event } from '@/types';
import type { AnimationItem } from 'lottie-web';

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

/* ---------- Lottie helpers ---------- */
let lottieModule: any = null;
const lottieCache = new WeakMap<HTMLElement, AnimationItem>();

async function ensureLottie() {
  if (!lottieModule) {
    lottieModule = (await import('lottie-web/build/player/lottie_svg')).default;
    lottieModule.setQuality('medium');
  }
  return lottieModule;
}

async function mountLottie(el: HTMLElement, animationData: any) {
  if (!el || lottieCache.has(el) || !animationData) return;
  const lottie = await ensureLottie();
  const anim: AnimationItem = lottie.loadAnimation({
    container: el,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    animationData,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });
  lottieCache.set(el, anim);
}

function destroyLottie(el?: HTMLElement | null) {
  if (!el) return;
  const anim = lottieCache.get(el);
  if (anim) {
    anim.destroy();
    lottieCache.delete(el);
  }
}

function useFireAnimationData() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    fetch('/lottie/fire.json')
      .then((r) => r.json())
      .then((d) => {
        if (alive) setData(d);
      });
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

function lottieDivIcon(id: string, size: number, badgeText?: number) {
  const s = Math.round(size);
  const badge =
    typeof badgeText === 'number'
      ? `<div style="position:absolute;right:-4px;top:-6px;min-width:22px;height:22px;border-radius:9999px;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3)">${badgeText}</div>`
      : '';
  return L.divIcon({
    className: 'lottie-fire-icon',
    iconSize: [s, s],
    iconAnchor: [s / 2, s - 6],
    html: `
      <div style="position:relative;width:${s}px;height:${s}px;will-change:transform">
        ${badge}
        <div class="lottie-slot" data-id="${id}" style="width:${s}px;height:${s}px"></div>
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
  const fireData = useFireAnimationData();

  useEffect(() => {
    const onZoomEnd = () => {
      document.querySelectorAll<HTMLElement>('.lottie-slot').forEach((el) => {
        const anim = lottieCache.get(el);
        if (anim) {
          anim.resize();
          anim.play();
        } else if (fireData) {
          mountLottie(el, fireData);
        }
      });
    };
    map.on('zoomend', onZoomEnd);
    return () => {
      map.off('zoomend', onZoomEnd);
    };
  }, [map, fireData]);

  useEffect(() => {
    const onMove = () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    };
    map.on('moveend', onMove);
    return () => {
      map.off('moveend', onMove);
    };
  }, [map]);

  useEffect(() => {
    if (!fireData) return;
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('.lottie-slot').forEach((el) => {
        if (!lottieCache.get(el)) mountLottie(el, fireData);
      });
    });
  }, [fireData]);

  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('.lottie-slot').forEach((el) => {
        if (!lottieCache.get(el) && fireData) mountLottie(el, fireData);
      });
    });
  }, [clusters, fireData]);

  return (
    <>
      {clusters.map((c: any) => {
        const [lng, lat] = c.geometry.coordinates;

        if (c.properties.cluster) {
          const count = c.properties.point_count as number;
          const size = Math.min(84, 36 + Math.log2(count + 1) * 12);
          const id = `cluster-${c.properties.cluster_id}`;
          const icon = lottieDivIcon(id, size, count);

          return (
            <Marker
              key={`${id}-${Math.round(zoom)}`}
              position={[lat, lng]}
              icon={icon}
              eventHandlers={{
                add: (e) => {
                  const el = (e.target as any)?.getElement?.()?.querySelector?.(
                    '.lottie-slot'
                  ) as HTMLElement | null;
                  if (el) mountLottie(el, fireData);
                },
                remove: (e) => {
                  const el = (e.target as any)?.getElement?.()?.querySelector?.(
                    '.lottie-slot'
                  ) as HTMLElement | null;
                  destroyLottie(el);
                },
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
        const icon = lottieDivIcon(id, 48);

        return (
          <Marker
            key={`${id}-${Math.round(zoom)}`}
            position={[ev.latitude as number, ev.longitude as number]}
            icon={icon}
            eventHandlers={{
              add: (e) => {
                const el = (e.target as any)?.getElement?.()?.querySelector?.(
                  '.lottie-slot'
                ) as HTMLElement | null;
                if (el) mountLottie(el, fireData);
              },
              remove: (e) => {
                const el = (e.target as any)?.getElement?.()?.querySelector?.(
                  '.lottie-slot'
                ) as HTMLElement | null;
                destroyLottie(el);
              },
              click: () => onEventClick(ev),
            }}
          >
            <Popup>
              <div className="p-2">
                <div className="font-semibold">{ev.title}</div>
                <button
                  className="mt-2 px-3 py-1 rounded bg-orange-500 text-white"
                  onClick={() => onEventClick(ev)}
                >
                  View details
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
            html: `<div style="width:22px;height:22px;border-radius:9999px;background:#007aff;box-shadow:0 0 0 6px rgba(0,122,255,.15)"></div>`,
          })}
        />
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
    <div style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={initialCenter} zoom={initialZoom} className="h-full w-full">
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