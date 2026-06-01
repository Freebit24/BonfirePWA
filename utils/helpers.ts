import { Event, CrowdLevel } from '@/types';
import { CROWD_LEVELS } from './constants';

export const getCrowdLevel = (event: Event): CrowdLevel => {
  if (!event.max_attendees) return 'low';
  
  const ratio = event.attendees_count / event.max_attendees;
  
  if (ratio >= CROWD_LEVELS.full.threshold) return 'full';
  if (ratio >= CROWD_LEVELS.high.threshold) return 'high';
  if (ratio >= CROWD_LEVELS.medium.threshold) return 'medium';
  return 'low';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateWithYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const generateQRCode = (eventId: string, userId: string): string => {
  return `bonfire-checkin-${eventId}-${userId}-${Date.now()}`;
};

export const isEventToday = (dateString: string): boolean => {
  const eventDate = new Date(dateString);
  const today = new Date();
  
  return eventDate.toDateString() === today.toDateString();
};

export const isEventUpcoming = (
  dateString: string,
  timeString: string,
  endDateString?: string,
  endTimeString?: string
): boolean => {
  const now = new Date();

  // If an end date/time is provided, consider the event upcoming if the end is in the future
  if (endDateString && endTimeString) {
    const endDateTime = new Date(`${endDateString}T${endTimeString}`);
    if (endDateTime > now) return true; // either ongoing or ends in future
  }

  // Fallback to start date/time
  const eventDateTime = new Date(`${dateString}T${timeString}`);
  return eventDateTime > now;
};

export const getEventStatus = (event: Event): string => {
  if (event.status === 'cancelled') return 'Cancelled';
  if (event.status === 'completed') return 'Completed';

  const now = new Date();

  // If end date/time is present, use it to determine if event has ended
  if (event.end_date && event.end_time) {
    const endDateTime = new Date(`${event.end_date}T${event.end_time}`);
    if (endDateTime < now) return 'Ended';
  } else {
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    if (eventDateTime < now) return 'Ended';
  }

  if (isEventToday(event.date)) return 'Today';
  return 'Upcoming';
};