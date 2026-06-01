export const EVENT_CATEGORIES = [
  { value: 'social', label: 'Social', icon: '🎉' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'food', label: 'Food & Drink', icon: '🍕' },
  { value: 'art', label: 'Art & Culture', icon: '🎨' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'networking', label: 'Networking', icon: '🤝' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌲' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'wellness', label: 'Wellness', icon: '🧘' },
] as const;

export const CROWD_LEVELS = {
  low: { label: 'Cozy', color: 'bg-green-100 text-green-800', threshold: 0.3 },
  medium: { label: 'Lively', color: 'bg-yellow-100 text-yellow-800', threshold: 0.7 },
  high: { label: 'Buzzing', color: 'bg-orange-100 text-orange-800', threshold: 0.9 },
  full: { label: 'Packed', color: 'bg-red-100 text-red-800', threshold: 1.0 },
} as const;

export const DEFAULT_MAP_CENTER = {
  lat: 40.7128,
  lng: -74.0060,
};

export const DEFAULT_MAP_ZOOM = 13;