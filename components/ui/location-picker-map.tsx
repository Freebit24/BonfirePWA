'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from './location-autocomplete';
import { Loader2, MapPin } from 'lucide-react';
import { logger } from '@/lib/logger';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChange: (data: { latitude: number; longitude: number; address?: string }) => void;
  height?: number;
}

export function LocationPickerMap({ latitude, longitude, onChange, height = 260 }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  // Initialize map once
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadGoogleMaps();
        if (!mapRef.current || !(window as any).google?.maps) return;

        const google = (window as any).google;
        geocoderRef.current = new google.maps.Geocoder();

        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 13,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
        });

        markerRef.current = new google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: mapInstance.current,
          draggable: true,
          icon: {
            url: 'https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2_hdpi.png',
            scaledSize: new google.maps.Size(27, 43),
          },
        });

        markerRef.current.addListener('dragend', async (event: any) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          let address = '';

          try {
            const result = await geocoderRef.current.geocode({ location: { lat, lng } });
            if (result?.results?.[0]?.formatted_address) {
              address = result.results[0].formatted_address;
            }
          } catch (err) {
            logger.warn('Reverse geocode failed', err);
          }

          onChange({ latitude: lat, longitude: lng, address });
        });
      } finally {
        setLoading(false);
      }
    };

    initMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (mapInstance.current) {
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep marker/map in sync when coordinates change externally
  useEffect(() => {
    if (mapInstance.current && markerRef.current && latitude && longitude) {
      const nextPos = { lat: latitude, lng: longitude };
      markerRef.current.setPosition(nextPos);
      mapInstance.current.setCenter(nextPos);
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <MapPin className="h-4 w-4" />
        Drag the pin to fine-tune the location.
      </div>
      <div
        ref={mapRef}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-800"
        style={{ height }}
      />
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading map...
        </div>
      )}
    </div>
  );
}
