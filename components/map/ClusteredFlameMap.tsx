// components/ClusteredFlameMap.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import supercluster from 'supercluster';
import { point as turfPoint } from '@turf/helpers';
import 'leaflet/dist/leaflet.css';
import type { Event } from '@/types';
import { Navigation } from 'lucide-react';

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
  onVisibleEventsChange,
}: {
  events: Event[];
  onEventClick: (e: Event) => void;
  userLocation: UserLocation;
  onVisibleEventsChange?: (events: Event[]) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());
  const [bounds, setBounds] = useState<L.LatLngBounds>(map.getBounds());
  const { index, clusters } = useClusters(events, zoom, bounds);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const openPopupRef = useRef<string | null>(null); // Track currently open popup
  const indexRef = useRef<any>(index); // Keep index reference updated

  // Update index ref
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Listen for openEventPopup event from side menu
  useEffect(() => {
    const handleOpenPopup = (e: any) => {
      const event = e.detail;
      if (!event || !event.id) return;

      console.log('Opening popup for event:', event.id);

      // Close previously open popup
      if (openPopupRef.current && openPopupRef.current !== event.id) {
        const prevMarker = markerRefs.current.get(openPopupRef.current);
        if (prevMarker) {
          prevMarker.closePopup();
        }
      }

      const marker = markerRefs.current.get(event.id);
      console.log('Marker exists:', !!marker);
      
      if (marker) {
        // Marker exists (not clustered), pan and open
        console.log('Marker found, opening directly');
        map.panTo([event.latitude, event.longitude], { animate: true });
        setTimeout(() => {
          try {
            const popup = marker.getPopup();
            if (popup) {
              marker.openPopup();
              openPopupRef.current = event.id;
              console.log('Popup opened successfully');
            } else {
              console.warn('Popup not found on marker');
            }
          } catch (error) {
            console.error('Error opening popup:', error);
          }
        }, 300);
      } else {
        // Marker doesn't exist yet (likely clustered)
        // Find which cluster contains this event and get the expansion zoom
        console.log('Marker not found, finding containing cluster');
        
        const currentZoom = map.getZoom();
        const allClusters = indexRef.current.getClusters([-180, -85, 180, 85], currentZoom);
        
        let targetZoom = currentZoom + 2; // Default fallback
        
        // Find the cluster that contains this event
        for (const cluster of allClusters) {
          if (cluster.properties.cluster) {
            const children = indexRef.current.getChildren(cluster.properties.cluster_id);
            const hasEvent = children.some((child: any) => child.properties.id === event.id);
            if (hasEvent) {
              // Get the zoom level that will expand this cluster
              targetZoom = Math.min(
                indexRef.current.getClusterExpansionZoom(cluster.properties.cluster_id),
                18
              );
              console.log('Found cluster, expansion zoom:', targetZoom);
              break;
            }
          }
        }
        
        console.log('Zooming to level:', targetZoom);
        map.setView([event.latitude, event.longitude], targetZoom, { animate: true });
        
        // After zooming, wait for re-render and try again with retry logic
        let retries = 0;
        const maxRetries = 5;
        
        const tryOpenPopup = () => {
          retries++;
          const newMarker = markerRefs.current.get(event.id);
          console.log(`Retry ${retries}: Marker found:`, !!newMarker);
          
          if (newMarker) {
            try {
              console.log('Opening popup after zoom');
              const popup = newMarker.getPopup();
              if (popup) {
                newMarker.openPopup();
                openPopupRef.current = event.id;
                console.log('Popup opened after zoom');
              } else {
                console.warn('Popup not ready on retry', retries);
                if (retries < maxRetries) {
                  setTimeout(tryOpenPopup, 200);
                }
              }
            } catch (error) {
              console.error('Error opening popup after zoom:', error);
            }
          } else if (retries < maxRetries) {
            // Retry after 200ms
            setTimeout(tryOpenPopup, 200);
          } else {
            console.log('Max retries reached, marker still not found');
          }
        };
        
        // Start retry logic after initial wait for zoom animation
        setTimeout(tryOpenPopup, 500);
      }
    };

    window.addEventListener('openEventPopup', handleOpenPopup as any);
    return () => window.removeEventListener('openEventPopup', handleOpenPopup as any);
  }, [map]);

  // Listen for zoom to event requests from sidebar
  useEffect(() => {
    const handleZoomToEvent = (e: CustomEvent) => {
      const event = e.detail;
      if (event && event.latitude && event.longitude) {
        console.log('Zooming to event:', event.id);
        
        // Find which cluster contains this event and get the expansion zoom
        const currentZoom = map.getZoom();
        const allClusters = indexRef.current.getClusters([-180, -85, 180, 85], currentZoom);
        
        let targetZoom = currentZoom + 1; // Default: zoom in by 1 level
        let foundInCluster = false;
        
        // Find the cluster that contains this event
        for (const cluster of allClusters) {
          if (cluster.properties.cluster) {
            const children = indexRef.current.getChildren(cluster.properties.cluster_id);
            const hasEvent = children.some((child: any) => child.properties.id === event.id);
            if (hasEvent) {
              // Get the zoom level that will expand this cluster (uncluster the events)
              targetZoom = Math.min(
                indexRef.current.getClusterExpansionZoom(cluster.properties.cluster_id),
                18
              );
              foundInCluster = true;
              console.log('Found in cluster, expansion zoom:', targetZoom);
              break;
            }
          }
        }
        
        // If not in a cluster, use a moderate zoom level
        if (!foundInCluster) {
          targetZoom = Math.max(currentZoom, 14);
        }
        
        map.setView([event.latitude, event.longitude], targetZoom, { animate: true });
        
        // Open popup after zoom completes
        setTimeout(() => {
          const marker = markerRefs.current.get(event.id);
          if (marker) {
            marker.openPopup();
            openPopupRef.current = event.id;
          }
        }, 600);
      }
    };

    window.addEventListener('zoomToEvent', handleZoomToEvent as any);
    return () => window.removeEventListener('zoomToEvent', handleZoomToEvent as any);
  }, [map]);

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
  // Extract visible events from clusters and notify parent
  useEffect(() => {
    if (!onVisibleEventsChange) return;
    
    const visibleEvents: Event[] = [];
    const seenIds = new Set<string>();

    // Recursive function to get all individual events from a cluster
    const getAllClusterMembers = (clusterId: number): any[] => {
      const children = index.getChildren(clusterId);
      const members: any[] = [];
      
      children.forEach((child: any) => {
        if (child.properties.cluster) {
          // If child is also a cluster, recurse
          members.push(...getAllClusterMembers(child.properties.cluster_id));
        } else {
          // If it's an individual event, add it
          members.push(child);
        }
      });
      
      return members;
    };

    clusters.forEach((c: any) => {
      if (c.properties.cluster) {
        // For clustered items, get all members recursively
        const allMembers = getAllClusterMembers(c.properties.cluster_id);
        allMembers.forEach((member: any) => {
          if (member.properties.id && !seenIds.has(member.properties.id)) {
            const event = events.find((e) => e.id === member.properties.id);
            if (event) {
              visibleEvents.push(event);
              seenIds.add(event.id);
            }
          }
        });
      } else {
        // For non-clustered items
        if (c.properties.id && !seenIds.has(c.properties.id)) {
          const event = events.find((e) => e.id === c.properties.id);
          if (event) {
            visibleEvents.push(event);
            seenIds.add(event.id);
          }
        }
      }
    });
    
    onVisibleEventsChange(visibleEvents);
  }, [clusters, events, onVisibleEventsChange, index]);

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
              } else {
                // Clean up when marker unmounts
                markerRefs.current.delete(ev.id);
              }
            }}
            eventHandlers={{
              mouseover: (e) => {
                // Close previously open popup when hovering over a new marker
                if (openPopupRef.current && openPopupRef.current !== ev.id) {
                  const prevMarker = markerRefs.current.get(openPopupRef.current);
                  if (prevMarker) {
                    prevMarker.closePopup();
                  }
                }
                
                // Open popup immediately on hover
                try {
                  const currentMarker = markerRefs.current.get(ev.id);
                  if (currentMarker && currentMarker.getPopup()) {
                    currentMarker.openPopup();
                    openPopupRef.current = ev.id;
                  }
                } catch (error) {
                  console.warn('Error opening popup on hover:', error);
                }
              },
              mouseout: (e) => {
                // Close popup only if mouse leaves both marker and popup
                try {
                  const popupElement = e.target.getPopup()?.getElement();
                  if (popupElement) {
                    popupElement.addEventListener('mouseenter', () => {
                      e.target.openPopup();
                    });
                    popupElement.addEventListener('mouseleave', () => {
                      e.target.closePopup();
                      if (openPopupRef.current === ev.id) {
                        openPopupRef.current = null;
                      }
                    });
                  }
                  e.target.closePopup();
                } catch (error) {
                  console.warn('Error closing popup on mouseout:', error);
                }
              },
            }}
          >
            <Popup autoClose={false} closeOnClick={false} closeButton={false}>
              <div className="overflow-hidden rounded-lg shadow-lg" style={{ width: '280px' }} onMouseEnter={() => {
                const marker = markerRefs.current.get(ev.id);
                if (marker) marker.openPopup();
              }} onMouseLeave={() => {
                const marker = markerRefs.current.get(ev.id);
                if (marker) marker.closePopup();
                // Only clear if this is still the open popup
                if (openPopupRef.current === ev.id) {
                  openPopupRef.current = null;
                }
              }}>
                {/* Event Image */}
                {ev.image_url && (
                  <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600">
                    <img 
                      src={ev.image_url} 
                      alt={ev.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-4 bg-white">
                  <h3 className="font-bold text-lg mb-2 text-gray-900 line-clamp-2">{ev.title}</h3>
                  
                  {ev.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-orange-500 mt-0.5">📍</span>
                      <span className="line-clamp-1">{ev.location}</span>
                    </div>
                    
                    {ev.date && ev.time && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-orange-500">🕐</span>
                        <span>{ev.date} • {ev.time}</span>
                      </div>
                    )}
                    
                    {ev.category && (
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                          {ev.category}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    onClick={() => onEventClick(ev)}
                  >
                    View Details
                  </button>
                </div>
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
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html: `<div style="width:16px;height:16px;border-radius:9999px;background:#007aff;box-shadow:0 0 0 4px rgba(0,122,255,.15);cursor:pointer"></div>`,
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
  onVisibleEventsChange,
  height = 600,
  initialCenter = [12.9716, 77.5946] as [number, number],
  initialZoom = 12,
  recenterBehavior = 'once',
}: {
  events: Event[];
  onEventClick: (e: Event) => void;
  userLocation: UserLocation;
  onVisibleEventsChange?: (events: Event[]) => void;
  height?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
  recenterBehavior?: 'once' | 'follow';
}) {
  const mapRef = useRef<L.Map | null>(null);

  const handleRecenter = () => {
    if (!userLocation || !mapRef.current) return;
    const targetZoom = Math.max(mapRef.current.getZoom() ?? 14, 14);
    mapRef.current.flyTo(
      [userLocation.latitude, userLocation.longitude],
      targetZoom,
      { animate: true, duration: 0.75 }
    );
  };

  return (
    <div
      className="relative"
      style={{ 
      height, 
      width: '100%', 
      borderRadius: 12, 
      overflow: 'hidden',
      contain: 'layout style paint',
      willChange: 'contents',
    }}
    >
      <MapContainer 
        center={initialCenter} 
        zoom={initialZoom} 
        className="h-full w-full"
        preferCanvas={false}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
        minZoom={2}
        maxBounds={[[-85, -170], [85, 170]]}
        maxBoundsViscosity={1.0}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <RecenterOnLocation userLocation={userLocation} behavior={recenterBehavior} minZoom={14} />
        <MapContent events={events} onEventClick={onEventClick} userLocation={userLocation} onVisibleEventsChange={onVisibleEventsChange} />
      </MapContainer>

      <button
        type="button"
        onClick={handleRecenter}
        disabled={!userLocation}
        className="absolute bottom-4 right-4 z-[1000] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white border border-gray-300 shadow-md hover:bg-gray-50 hover:shadow-lg active:shadow-xl active:scale-[0.98] text-gray-700 hover:text-orange-600 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Recenter to your location"
      >
        <Navigation className="h-5 w-5 -rotate-45" />
      </button>
    </div>
  );
}