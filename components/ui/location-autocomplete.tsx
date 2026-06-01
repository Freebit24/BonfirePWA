// components/ui/location-autocomplete.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

// Type declarations for Google Maps
declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

interface LocationData {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  name?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onLocationSelect: (locationData: LocationData) => void;
  placeholder?: string;
  required?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter event location",
  required = false
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if Google Maps is already loaded
        if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
          initializeAutocomplete();
          return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
        script.async = true;
        script.defer = true;

        // Set up callback
        (window as any).initMap = () => {
          initializeAutocomplete();
        };

        script.onerror = () => {
          console.error('Failed to load Google Maps');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setIsLoading(false);
      }
    };

    const initializeAutocomplete = () => {
      if (!inputRef.current || !(window as any).google) return;

      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry.location'],
          componentRestrictions: { country: 'in' }, // Restrict to India, remove if global
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (place && place.formatted_address && place.geometry?.location) {
          const locationData: LocationData = {
            address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: place.place_id || '',
            name: place.name,
          };

          onChange(place.formatted_address);
          onLocationSelect(locationData);
        }
      });

      setIsLoaded(true);
      setIsLoading(false);
    };

    loadGoogleMaps();
  }, [onChange, onLocationSelect]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id="location"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={isLoading}
        className="pl-10"
      />
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
      )}
    </div>
  );
}