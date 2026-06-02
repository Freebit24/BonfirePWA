import { create } from 'zustand';
import { Event, EventCategory, EventInvite, MapBounds } from '@/types';
import { db } from '@/utils/supabase';
import { isEventUpcoming } from '@/utils/helpers';
import { logger } from '@/lib/logger';

interface EventState {
  events: Event[];
  selectedEvent: Event | null;
  loading: boolean;
  // Pagination state for lazy loading in list view
  pageSize: number;
  lastCursor: string | null; // created_at cursor
  hasMore: boolean;
  isPaginating: boolean;
  searchQuery: string;
  selectedCategory: EventCategory | null;
  selectedTags: string[];
  dateSort: 'newest' | 'oldest' | null;
  mapBounds: MapBounds | null;
  viewMode: 'map' | 'list';
  hasJoinedMap: Record<string, boolean>;

  fetchEvents: (bounds?: MapBounds) => Promise<void>;
  // Paginated fetching for list view
  fetchInitialEvents: () => Promise<void>;
  fetchMoreEvents: () => Promise<void>;
  fetchEventById: (id: string) => Promise<Event | null>;
  createEvent: (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => Promise<Event>;
  updateEvent: (id: string, updates: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<void>;
  inviteUserByEmail: (eventId: string, email: string) => Promise<EventInvite>;
  fetchInvites: (eventId: string) => Promise<EventInvite[]>;
  deleteInvite: (inviteId: string) => Promise<void>;
  joinEvent: (eventId: string, userId: string) => Promise<boolean>;
  leaveEvent: (eventId: string, userId: string) => Promise<boolean>;
  hasJoinedEvent: (eventId: string, userId: string) => Promise<boolean>;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: EventCategory | null) => void;
  setSelectedTags: (tags: string[]) => void;
  setDateSort: (sort: 'newest' | 'oldest' | null) => void;
  setMapBounds: (bounds: MapBounds | null) => void;
  setViewMode: (mode: 'map' | 'list') => void;
  setSelectedEvent: (event: Event | null) => void;

  filteredEvents: () => Event[];
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  selectedEvent: null,
  loading: false,
  pageSize: 12,
  lastCursor: null,
  hasMore: true,
  isPaginating: false,
  searchQuery: '',
  selectedCategory: null,
  selectedTags: [],
  dateSort: 'newest',
  mapBounds: null,
  viewMode: 'map',
  hasJoinedMap: {},

  fetchEvents: async (bounds?: MapBounds) => {
    set({ loading: true });
    try {
      let query = db
        .from('events')
        .select('*')
        .eq('status', 'active');
      // Removed .eq('is_private', false) - let RLS policies handle visibility
      // RLS will show: public events + user's own events + events they're invited to

      if (bounds) {
        query = query
          .gte('latitude', bounds.south)
          .lte('latitude', bounds.north)
          .gte('longitude', bounds.west)
          .lte('longitude', bounds.east);
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ events: (data as Event[]) || [] });
    } catch (error: any) {
      console.error('Error fetching events:', error?.message || error);
      set({ events: [] });
    } finally {
      set({ loading: false });
    }
  },

  // Paginated initial fetch for list view: order by created_at desc
  fetchInitialEvents: async () => {
    set({ loading: true, lastCursor: null, hasMore: true });
    try {
      const { pageSize } = get();
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) throw error;

      const events = (data as Event[]) || [];
      const last = events[events.length - 1] || null;
      set({
        events,
        lastCursor: last ? last.created_at : null,
        hasMore: events.length === pageSize,
      });
    } catch (error: any) {
      console.error('Error fetching events:', error?.message || error);
      set({ events: [], hasMore: false });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch next page using created_at cursor (descending)
  fetchMoreEvents: async () => {
    const { isPaginating, hasMore, lastCursor, pageSize } = get();
    if (isPaginating || !hasMore) return;
    if (!lastCursor) return; // No cursor to paginate

    set({ isPaginating: true });
    try {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('status', 'active')
        .lt('created_at', lastCursor)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (error) throw error;

      const next = (data as Event[]) || [];
      const last = next[next.length - 1] || null;
      set(state => ({
        events: [...state.events, ...next],
        lastCursor: last ? last.created_at : state.lastCursor,
        hasMore: next.length === pageSize,
      }));
    } catch (error: any) {
      console.error('Error fetching events:', error?.message || error);
      // On error, stop further pagination attempts for this session
      set({ hasMore: false });
    } finally {
      set({ isPaginating: false });
    }
  },

  fetchEventById: async (id: string) => {
    try {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ selectedEvent: data as Event });
      return data as Event;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  },

  createEvent: async (eventData) => {
    const { data, error } = await db
      .from('events')
      .insert(eventData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw error;
    }

    // Create notification for organizer
    if (eventData.organizer_id) {
      try {
        await db.from('notifications').insert({
          user_id: eventData.organizer_id,
          type: 'event_published',
          title: 'Event Published Successfully',
          message: `Your event "${eventData.title}" is now live and visible to attendees`,
          related_event_id: data.id,
        });
      } catch (notifError) {
        logger.warn('Failed to create notification:', notifError);
      }
    }

    set(state => ({ events: [...state.events, data as Event] }));
    return data as Event;
  },

  inviteUserByEmail: async (eventId, email) => {
    const cleanedEmail = (email || '').trim().toLowerCase();
    if (!cleanedEmail) {
      throw new Error('Email is required');
    }

    // Find profile by email
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, email')
      .eq('email', cleanedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile by email:', profileError);
      throw profileError;
    }

    if (!profile) {
      throw new Error('No user found with that email');
    }

    // Avoid duplicate invites
    const { data: existing, error: existingError } = await db
      .from('event_invites')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing invite:', existingError);
      throw existingError;
    }

    if (existing) {
      throw new Error('User is already invited');
    }

    const { data, error } = await db
      .from('event_invites')
      .insert({ event_id: eventId, user_id: profile.id, email: cleanedEmail, status: 'pending' })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      throw error;
    }

    return data as EventInvite;
  },

  fetchInvites: async (eventId) => {
    const { data, error } = await db
      .from('event_invites')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      throw error;
    }

    // Fetch user details separately to avoid FK issues
    const invitesWithUsers = await Promise.all(
      (data || []).map(async (invite: any) => {
        if (invite.user_id) {
          const { data: user } = await db
            .from('profiles')
            .select('id, email, name, avatar_url')
            .eq('id', invite.user_id)
            .single();
          return { ...invite, user };
        }
        return invite;
      })
    );

    return invitesWithUsers;
  },

  deleteInvite: async (inviteId) => {
    const { error } = await db
      .from('event_invites')
      .delete()
      .eq('id', inviteId);

    if (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }
  },

  updateEvent: async (id, updates) => {
    try {
      logger.log('Updating event:', id, updates);
      const { error } = await db
        .from('events')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Error updating event:', error);
        throw error;
      }

      logger.log('Update successful, re-fetching event...');
      // Try to re-fetch the event to ensure consistent shape. If RLS prevents
      // reading (e.g., visibility/ownership changed), fall back to local merge.
      const updated = await get().fetchEventById(id);

      let result = updated;
      if (!result) {
        // Fallback: merge updates into existing event in store to avoid breaking the UI
        const current = get().events.find(e => e.id === id) || get().selectedEvent;
        if (current) {
          result = { ...current, ...updates, updated_at: new Date().toISOString() } as any;
          logger.warn('Re-fetch failed; using locally merged event after update');
        }
      }

      if (!result) {
        // As a last resort, do not throw; keep UI responsive
        logger.error('Updated event not found and no local copy available');
        return null;
      }

      set(state => ({
        events: state.events.map(event => (event.id === id ? (result as any) : event)),
        selectedEvent: state.selectedEvent?.id === id ? (result as any) : state.selectedEvent,
      }));
      logger.log('Store updated with new event data');

      // Refresh the public events list so other views reflect the update
      try {
        await get().fetchEvents();
        logger.log('Events list refreshed after update');
      } catch (err) {
        logger.warn('Failed to refresh events after update', err);
      }

      return result;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },

  deleteEvent: async (id) => {
    const { error } = await db
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }

    set(state => ({
      events: state.events.filter(event => event.id !== id),
      selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
    }));
  },

  joinEvent: async (eventId, userId) => {
    const alreadyJoined = get().hasJoinedMap[eventId];
    if (alreadyJoined) return false;

    // Check if event has reached max capacity
    const { data: eventData } = await db
      .from('events')
      .select('max_attendees, attendees_count, title, is_private, require_approval, organizer_id')
      .eq('id', eventId)
      .single();

    if (eventData?.max_attendees && eventData.attendees_count >= eventData.max_attendees) {
      console.error('Event has reached max capacity');
      return false;
    }

    // For private events requiring approval, only organizers can join directly
    // Non-organizers must use submitJoinRequest (handled in event details client)
    if (eventData?.is_private && eventData?.require_approval) {
      const isOrganizer = eventData?.organizer_id === userId;
      if (!isOrganizer) {
        console.error('Cannot directly join private event that requires approval. Use submitJoinRequest instead.');
        return false;
      }
      // Organizers use server action to bypass RLS
      // This is called from event-details-client which already handles the import
      // For now, return false and let the client handle it via server action
      console.error('Organizers should use approveJoinRequest server action');
      return false;
    }

    // Public events or private without approval - direct join with approved status
    const { error } = await db
      .from('event_attendees')
      .insert({ event_id: eventId, user_id: userId, status: 'approved' });

    if (error) {
      console.error('Join event error:', error);
      return false;
    }

    // Create RSVP confirmation notification for user
    if (eventData?.title) {
      try {
        await db.from('notifications').insert({
          user_id: userId,
          type: 'rsvp_confirmation',
          title: 'RSVP Confirmed',
          message: `You're all set for "${eventData.title}"`,
          related_event_id: eventId,
        });
      } catch (notifError) {
        logger.warn('Failed to create RSVP notification:', notifError);
      }
    }

    const updated = await get().fetchEventById(eventId);

    set(state => ({
      events: state.events.map(event =>
        event.id === eventId && updated ? updated : event
      ),
      selectedEvent:
        state.selectedEvent?.id === eventId && updated
          ? updated
          : state.selectedEvent,
      hasJoinedMap: { ...state.hasJoinedMap, [eventId]: true },
    }));

    return true;
  },

  leaveEvent: async (eventId, userId) => {
    const { error } = await db
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Leave event error:', error);
      return false;
    }

    const updated = await get().fetchEventById(eventId);

    set(state => ({
      events: state.events.map(event =>
        event.id === eventId && updated ? updated : event
      ),
      selectedEvent:
        state.selectedEvent?.id === eventId && updated
          ? updated
          : state.selectedEvent,
      hasJoinedMap: { ...state.hasJoinedMap, [eventId]: false },
    }));

    return true;
  },

  hasJoinedEvent: async (eventId, userId) => {
    const { data, error } = await db
      .from('event_attendees')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Check join error:', error);
      return false;
    }

    // CRITICAL: Only consider user as "joined" if status is 'approved'
    const isApproved = data?.status === 'approved';

    set(state => ({
      hasJoinedMap: { ...state.hasJoinedMap, [eventId]: isApproved },
    }));

    return isApproved;
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setDateSort: (sort) => set({ dateSort: sort }),
  setMapBounds: (bounds) => set({ mapBounds: bounds }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),

  filteredEvents: () => {
    const { events, searchQuery, selectedCategory, selectedTags, dateSort } = get();

    const filtered = events.filter(event => {
      if (!isEventUpcoming(event.date, event.time, (event as any).end_date, (event as any).end_time)) {
        return false;
      }

      const matchesSearch =
        searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === null || event.category === selectedCategory;

      const matchesTags =
        selectedTags.length === 0 ||
        event.tags.some(tag => selectedTags.includes(tag));

      return matchesSearch && matchesCategory && matchesTags;
    });

    const sorter = (a: Event, b: Event) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      if (dateSort === 'oldest') return aTime - bTime;
      return bTime - aTime;
    };

    return filtered.sort(sorter);
  },
}));
