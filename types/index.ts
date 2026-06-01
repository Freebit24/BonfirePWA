export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  date: string;
  time: string;
  duration: number; // in minutes
  category: EventCategory;
  organizer_id: string;
  organizer?: User;
  attendees_count: number;
  max_attendees?: number;
  image_url?: string;
  tags: string[];
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  user?: User;
  checked_in: boolean;
  check_in_time?: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  event_id: string;
  user_id: string;
  qr_code: string;
  checked_in: boolean;
  check_in_time?: string;
  created_at: string;
}

export type EventCategory = 
  | 'social'
  | 'music'
  | 'sports'
  | 'food'
  | 'art'
  | 'education'
  | 'networking'
  | 'outdoor'
  | 'technology'
  | 'wellness';

export type EventStatus = 'active' | 'cancelled' | 'completed';

export type CrowdLevel = 'low' | 'medium' | 'high' | 'full';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'event_reminder' | 'event_update' | 'new_event' | 'general';
  read: boolean;
  created_at: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}