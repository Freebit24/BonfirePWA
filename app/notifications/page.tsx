'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Calendar, 
  MapPin, 
  Users, 
  AlertCircle,
  Check,
  Trash2
} from 'lucide-react';
import { formatDate } from '@/utils/helpers';

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    title: 'Event Reminder',
    message: 'Tech Meetup Downtown starts in 3 hours',
    type: 'event_reminder' as const,
    read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'New Event Near You',
    message: 'Coffee & Code session has been created in your area',
    type: 'new_event' as const,
    read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'Event Update',
    message: 'Location changed for Weekend Food Festival',
    type: 'event_update' as const,
    read: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    title: 'Welcome to Bonfire!',
    message: 'Start discovering amazing events in your area',
    type: 'general' as const,
    read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const notificationIcons = {
  event_reminder: Calendar,
  event_update: AlertCircle,
  new_event: MapPin,
  general: Bell,
};

const notificationColors = {
  event_reminder: 'text-blue-500',
  event_update: 'text-orange-500',
  new_event: 'text-green-500',
  general: 'text-gray-500',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const NotificationCard = ({ notification }: { notification: typeof mockNotifications[0] }) => {
    const Icon = notificationIcons[notification.type];
    const iconColor = notificationColors[notification.type];

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`border-l-4 ${!notification.read ? 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10' : 'border-l-gray-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm">{notification.title}</h3>
                  <div className="flex items-center gap-1">
                    {!notification.read && (
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    {formatDate(notification.created_at)}
                  </span>
                  
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-orange-500 hover:text-orange-600"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay updated with your events and activities
              </p>
            </div>
            
            {unreadNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                className="text-orange-500 border-orange-500 hover:bg-orange-50"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" className="relative">
                All Notifications
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="relative">
                Unread
                {unreadNotifications.length > 0 && (
                  <Badge variant="default" className="ml-2 text-xs bg-orange-500">
                    {unreadNotifications.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
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
                unreadNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}