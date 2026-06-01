'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Bell,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
  Check,
  Trash2,
  Settings,
  Mail,
  Smartphone,
  UserPlus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '@/utils/helpers';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { cn } from '@/lib/utils';

const notificationIcons = {
  rsvp_confirmation: Users,
  event_reminder: Calendar,
  event_update: AlertCircle,
  organizer_alert: Users,
  event_published: Bell,
  upcoming_event: Calendar,
  attendee_checkin: Check,
  join_request: UserPlus,
  join_approved: CheckCircle,
  join_rejected: XCircle,
};

const notificationColors = {
  rsvp_confirmation: 'text-blue-500',
  event_reminder: 'text-orange-500',
  event_update: 'text-red-500',
  organizer_alert: 'text-purple-500',
  event_published: 'text-green-500',
  upcoming_event: 'text-yellow-500',
  attendee_checkin: 'text-teal-500',
  join_request: 'text-indigo-500',
  join_approved: 'text-emerald-500',
  join_rejected: 'text-rose-500',
};

const notificationLabels = {
  rsvp_confirmation: 'RSVP Confirmation',
  event_reminder: 'Event Reminder',
  event_update: 'Event Update',
  organizer_alert: 'Organizer Alert',
  event_published: 'Event Published',
  upcoming_event: 'Upcoming Event',
  attendee_checkin: 'Check-in',
  join_request: 'Join Request',
  join_approved: 'Request Approved',
  join_rejected: 'Request Declined',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    notifications,
    settings,
    loading,
    hasMore,
    fetchNotifications,
    fetchNotificationSettings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateSettings,
    loadMore,
  } = useNotificationStore();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch notifications and settings on mount
  useEffect(() => {
    if (user) {
      fetchNotifications(user.id);
      fetchNotificationSettings(user.id);
    }
  }, [user, fetchNotifications, fetchNotificationSettings]);

  const unreadNotifications = notifications.filter(n => !n.read);
  const filteredNotifications = selectedType
    ? notifications.filter(n => n.type === selectedType)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.related_event_id) {
      if (notification.type === 'organizer_alert' || notification.type === 'event_published') {
        router.push(`/organizer/edit/${notification.related_event_id}`);
      } else {
        router.push(`/event/${notification.related_event_id}`);
      }
    }
  };

  const NotificationCard = ({ notification }: { notification: Notification }) => {
    const Icon = notificationIcons[notification.type] || Bell;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="group flex items-start gap-3 px-4 py-3 border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => handleNotificationClick(notification)}
        >
          {/* Unread dot indicator */}
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-4 flex-shrink-0" />
          )}

          {/* Icon container */}
          <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-gray-300" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium text-sm sm:text-base truncate">{notification.title}</h3>
                  <span className="text-xs text-gray-500 uppercase tracking-wide truncate">
                    {notificationLabels[notification.type]}
                  </span>
                </div>
              </div>
              {/* Hover actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {/* Mark as read (only if unread) */}
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    aria-label="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {notification.message}
            </p>

            <div className="mt-2">
              <span className="text-sm text-gray-500" title={formatDate(notification.created_at)}>
                {formatRelativeTime(notification.created_at)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay updated with your events and activities
              </p>
            </div>

            <div className="flex gap-2">
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => user && markAllAsRead(user.id)}
                  className="text-orange-500 border-orange-500 hover:bg-orange-50"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Notifications */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="bg-gray-900 p-1 rounded-lg inline-flex">
              <TabsTrigger
                value="all"
                className="px-3 py-1 rounded-md text-sm text-gray-400 hover:text-gray-200 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="px-3 py-1 rounded-md text-sm text-gray-400 hover:text-gray-200 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
              >
                Unread
                {unreadNotifications.length > 0 && (
                  <Badge variant="default" className="ml-2 text-xs bg-orange-500">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="organizer"
                className="px-3 py-1 rounded-md text-sm text-gray-400 hover:text-gray-200 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-sm hidden md:inline-flex"
              >
                Organizer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You&apos;re all caught up! New notifications will appear here.
                  </p>
                </div>
              ) : (
                <>
                  {notifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                  {hasMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => user && loadMore(user.id)}
                    >
                      Load more
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="unread" className="space-y-4">
              {unreadNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You have no unread notifications.
                  </p>
                </div>
              ) : (
                <>
                  {unreadNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="organizer" className="space-y-4">
              {notifications
                .filter(n => n.type === 'organizer_alert' || n.type === 'event_published' || n.type === 'rsvp_confirmation')
                .length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2">No organizer alerts</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You&apos;ll see organizer notifications here.
                  </p>
                </div>
              ) : (
                notifications
                  .filter(n => n.type === 'organizer_alert' || n.type === 'event_published' || n.type === 'rsvp_confirmation')
                  .map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Manage how you receive notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-gray-500">Receive emails about events</p>
                </div>
              </div>
              <Switch
                checked={settings?.email_notifications_enabled ?? true}
                onCheckedChange={(checked) => {
                  if (user) {
                    updateSettings(user.id, {
                      email_notifications_enabled: checked,
                    });
                  }
                }}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-gray-500">Receive browser push notifications</p>
                </div>
              </div>
              <Switch
                checked={settings?.push_notifications_enabled ?? true}
                onCheckedChange={(checked) => {
                  if (user) {
                    updateSettings(user.id, {
                      push_notifications_enabled: checked,
                    });
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}