'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon } from 'leaflet';
import { Event, MapBounds } from '@/types';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/utils/constants';
import { formatDate, formatTime } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-icon-shadow.png',
});

// Custom flame icon
const flameIcon = new Icon({
  iconUrl: '/flame-icon.png',
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

// User location marker icon
const userLocationIcon = new Icon({
  iconUrl:
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMzMzMyMzIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiMwMDdBRkYiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, 0],
  className: 'user-location-marker',
});

function MapEvents({
  events,
  onEventClick,
  userLocation,
}: {
  events: Event[];
  onEventClick: (event: Event) => void;
  userLocation?: UserLocation | null;
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
          >
            <Popup className="min-w-[250px]">
              <div className="p-2">
                <h3 className="font-bold text-lg mb-2 line-clamp-2">
                  {event.title}
                </h3>

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
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
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

export function EventMap({
  events,
  onEventClick,
  onBoundsChange,
  userLocation,
  className,
}: EventMapProps) {
  const mapRef = useRef<any>(null);

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

        <MapEvents
          events={events}
          onEventClick={onEventClick}
          userLocation={userLocation}
        />
      </MapContainer>
    </div>
  );
}
