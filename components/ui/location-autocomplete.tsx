// components/ui/location-autocomplete.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

// Type declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  name?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string) => void;
  onSelect?: (locationData: LocationData) => void;
  onLocationSelect?: (locationData: LocationData) => void;
  placeholder?: string;
  required?: boolean;
  types?: string[];
}

// Global promise to manage single Google Maps load - prevents duplicate script loads
let googleMapsLoadingPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  // Return existing promise if already loading or loaded
  if (googleMapsLoadingPromise) {
    return googleMapsLoadingPromise;
  }

  // Check if Google Maps is already loaded
  if ((window as any).google?.maps?.places) {
    return Promise.resolve();
  }

  // Create promise and store it
  googleMapsLoadingPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait for Google Maps to be fully initialized
        const checkGoogleMaps = setInterval(() => {
          if ((window as any).google?.maps?.places) {
            clearInterval(checkGoogleMaps);
            resolve();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkGoogleMaps);
          resolve();
        }, 10000);
      };

      script.onerror = () => {
        console.error('Failed to load Google Maps');
        googleMapsLoadingPromise = null; // Reset on error
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      googleMapsLoadingPromise = null; // Reset on error
      reject(error);
    }
  });

  return googleMapsLoadingPromise;
};

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  onLocationSelect,
  placeholder = "Enter event location",
  required = false,
  types = ['establishment', 'geocode']
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const initializedRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAutocomplete = async () => {
      try {
        // Load Google Maps (or wait if already loading)
        await loadGoogleMaps();

        // Initialize autocomplete only once per component instance
        if (initializedRef.current) {
          setIsLoading(false);
          return;
        }

        if (inputRef.current && !autocompleteRef.current && (window as any).google?.maps?.places) {
          const autocomplete = new (window as any).google.maps.places.Autocomplete(
            inputRef.current,
            {
              types,
              fields: ['place_id', 'name', 'formatted_address', 'geometry.location'],
            }
          );

          autocompleteRef.current = autocomplete;
          initializedRef.current = true;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (place && place.formatted_address && place.geometry?.location) {
              const locationData: LocationData = {
                address: place.formatted_address,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng(),
                placeId: place.place_id || '',
                name: place.name,
              };

              onChange(place.formatted_address);
              
              // Call whichever callback is provided (prefer onSelect for backward compatibility)
              if (onSelect) {
                onSelect(locationData);
              } else if (onLocationSelect) {
                onLocationSelect(locationData);
              }
            }
          });
        }
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAutocomplete();

    // Cleanup: don't remove the script since other components might use it
    return () => {
      // Component cleanup - preserve global script for reuse
      // Reset instance flags for safety on unmount
      autocompleteRef.current = null;
      initializedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
