'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon } from 'leaflet';
import { Event, MapBounds } from '@/types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';
import { formatDate, formatTime } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Users, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: '/app/leaflet/marker-icon-2x.png',
  iconUrl: '/app/leaflet/marker-icon.png',
  shadowUrl: '/app/leaflet/marker-icon-shadow.png',
});

// Custom flame icon
const flameIcon = new Icon({
  iconUrl: '/app/flame-icon.png',
  iconSize: [64, 64],
  iconAnchor: [16, 30],
  popupAnchor: [0, -30],
  className: 'flame-marker',
});

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface EventMapProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  userLocation?: UserLocation | null;
  className?: string;
}

export interface EventMapRef {
  zoomToEvent: (event: Event) => void;
}

// User location marker icon
const userLocationIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzMzMyMzIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiMwMDdBRkYiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, 0],
  className: 'user-location-marker',
});

function MapEventsComponent({
  events,
  onEventClick,
  userLocation,
  markersRef,
}: {
  events: Event[];
  onEventClick: (event: Event) => void;
  userLocation?: UserLocation | null;
  markersRef: React.MutableRefObject<Map<string, any>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], 13);
    } else if (events.length > 0) {
      const bounds = events.map(
        (event) => [event.latitude, event.longitude] as [number, number]
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [events, map, userLocation]);

  return (
    <>
      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userLocationIcon}
        >
          <Popup>
            <div className="text-center p-2">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Your Location</span>
              </div>
              <p className="text-sm text-gray-600">You are here</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Clustered event markers */}
      <MarkerClusterGroup chunkedLoading>
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={flameIcon}
            ref={(el) => {
              if (el) {
                markersRef.current.set(event.id, el);
              }
            }}
          >
            <Popup className="min-w-[250px]">
              <div className={cn(
                "p-2 rounded",
                event.visibility === 'private' ? "bg-purple-50 dark:bg-purple-900/20" : ""
              )}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  {event.visibility === 'private' && (
                    <div className="ml-2 flex-shrink-0">
                      <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(event.date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(event.time)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{event.attendees_count} going</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {event.description}
                </p>

                <Button
                  size="sm"
                  className={cn(
                    "w-full text-white",
                    event.visibility === 'private'
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  )}
                  onClick={() => onEventClick(event)}
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </>
  );
}

export const EventMap = forwardRef<EventMapRef, EventMapProps>(
  function EventMap(
    {
      events,
      onEventClick,
      onBoundsChange,
      userLocation,
      className,
    },
    ref
  ) {
    const mapRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());

    useImperativeHandle(ref, () => ({
      zoomToEvent: (event: Event) => {
        if (mapRef.current) {
          mapRef.current.setView([event.latitude, event.longitude], 16, {
            animate: true,
            duration: 1,
          });
          // Open the popup for the marker
          setTimeout(() => {
            const marker = markersRef.current.get(event.id);
            if (marker) {
              marker.openPopup();
            }
          }, 200);
        }
      },
    }), []);

    const handleBoundsChange = () => {
      if (mapRef.current && onBoundsChange) {
        const bounds = mapRef.current.getBounds();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    };

    const getInitialCenter = (): [number, number] => {
      if (userLocation) {
        return [userLocation.latitude, userLocation.longitude];
      }
      return [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];
    };

    const getInitialZoom = (): number => {
      return userLocation ? 13 : DEFAULT_MAP_ZOOM;
    };

    return (
      <div className={className}>
        <style jsx>{`
          .flame-marker {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }
          .flame-marker:hover {
            filter: drop-shadow(0 4px 8px rgba(255, 87, 34, 0.5));
          }
          .user-location-marker {
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
        <MapContainer
          key={`${getInitialCenter()[0]}-${getInitialCenter()[1]}-${getInitialZoom()}`}
          center={getInitialCenter()}
          zoom={getInitialZoom()}
          className="h-full w-full rounded-lg"
          ref={mapRef}
          whenReady={() => {
            if (mapRef.current) {
              mapRef.current.on('moveend', handleBoundsChange);
            }
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <MapEventsComponent
            events={events}
            onEventClick={onEventClick}
            userLocation={userLocation}
            markersRef={markersRef}
          />
        </MapContainer>
      </div>
    );
  }
);
