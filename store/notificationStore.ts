import { create } from 'zustand';
import { db } from '@/utils/supabase';
import { logger } from '@/lib/logger';

export interface Notification {
  id: string;
  user_id: string;
  type: 'rsvp_confirmation' | 'event_reminder' | 'event_update' | 'organizer_alert' | 'event_published' | 'upcoming_event' | 'attendee_checkin';
  title: string;
  message: string;
  related_event_id?: string;
  read: boolean;
  created_at: string;
  email_sent?: boolean;
  push_sent?: boolean;
}

export interface NotificationSettings {
  user_id: string;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface NotificationState {
  notifications: Notification[];
  settings: NotificationSettings | null;
  loading: boolean;
  hasMore: boolean;
  currentPage: number;

  // Queries
  fetchNotifications: (userId: string, type?: string, limit?: number, offset?: number) => Promise<void>;
  fetchNotificationSettings: (userId: string) => Promise<void>;
  loadMore: (userId: string, type?: string) => Promise<void>;

  // Mutations
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateSettings: (userId: string, settings: Partial<NotificationSettings>) => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;

  // State
  setLoading: (loading: boolean) => void;
}

const NOTIFICATIONS_PER_PAGE = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  settings: null,
  loading: false,
  hasMore: true,
  currentPage: 0,

  fetchNotifications: async (userId: string, type?: string, limit = NOTIFICATIONS_PER_PAGE, offset = 0) => {
    // Track request to prevent stale overwrites
    const requestId = Math.random().toString(36).slice(2);
    set({ loading: true, lastRequestId: requestId } as any);
    try {
      let query = db
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Ignore if a newer request has started
      const currentReq = (get() as any).lastRequestId;
      if (currentReq === requestId) {
        set({
          notifications: offset === 0 ? (data as Notification[]) : [...get().notifications, ...(data as Notification[])],
          hasMore: data && data.length === limit,
          currentPage: Math.floor(offset / limit),
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      // Only clear loading if this request is still current
      const currentReq = (get() as any).lastRequestId;
      if (currentReq === requestId) {
        set({ loading: false });
      }
    }
  },

  loadMore: async (userId: string, type?: string) => {
    const { currentPage } = get();
    const offset = (currentPage + 1) * NOTIFICATIONS_PER_PAGE;
    await get().fetchNotifications(userId, type, NOTIFICATIONS_PER_PAGE, offset);
  },

  fetchNotificationSettings: async (userId: string) => {
    try {
      const { data, error } = await db
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (data) {
        set({ settings: data as NotificationSettings });
      } else {
        // Create default settings if they don't exist
        const defaultSettings: Omit<NotificationSettings, 'created_at' | 'updated_at'> = {
          user_id: userId,
          email_notifications_enabled: true,
          push_notifications_enabled: true,
        };
        await get().updateSettings(userId, defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      const { error } = await db
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      const { error } = await db
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      const { error } = await db
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.filter(n => n.id !== notificationId),
      }));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  updateSettings: async (userId: string, settings: Partial<NotificationSettings>) => {
    try {
      // Use UPSERT to avoid race conditions on unique user_id
      const { error } = await db
        .from('notification_settings')
        .upsert(
          {
            user_id: userId,
            email_notifications_enabled: settings.email_notifications_enabled ?? true,
            push_notifications_enabled: settings.push_notifications_enabled ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      await get().fetchNotificationSettings(userId);
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  },

  createNotification: async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      const { error } = await db
        .from('notifications')
        .insert(notification);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },
}));
