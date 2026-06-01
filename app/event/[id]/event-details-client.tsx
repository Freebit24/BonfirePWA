'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
// Crowd badge removed per request
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { formatDate, formatTime, getEventStatus } from '@/utils/helpers';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { toast } from 'sonner';
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Share2,
  Navigation,
  QrCode,
  Edit,
} from 'lucide-react';

export default function EventDetailsClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    selectedEvent,
    fetchEventById,
    joinEvent,
    leaveEvent,
    hasJoinedEvent,
  } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [organizerName, setOrganizerName] = useState<string>('');

  useEffect(() => {
    const fetchAndCheckJoinStatus = async () => {
      console.log('Event details page: fetching event', eventId);
      if (!eventId || !user) return;
      const event = await fetchEventById(eventId);
      console.log('Event details page: fetched event', event);
      try {
        // force app-router to refresh server data so any SSR/SC caches update
        router.refresh();
        console.log('Router refreshed after fetching event');
      } catch (e) {
        console.debug('router.refresh not available or failed', e);
      }
      if (event && user) {
        const joined = await hasJoinedEvent(event.id, user.id);
        setIsJoined(joined);
        
        // Fetch organizer name
        if (event.organizer_id) {
          // Try to get from organizer object first
          if (event.organizer?.name) {
            setOrganizerName(event.organizer.name);
          } else if (event.organizer_id === user.id) {
            // If current user is the organizer
            setOrganizerName(user.user_metadata.name || user.email || 'You');
          } else {
            // You may need to fetch user profile here if you have a getUserById function
            // For now, we'll use a fallback
            setOrganizerName('Event Organizer');
          }
        }
      }
      setLoading(false);
    };

    fetchAndCheckJoinStatus();
  }, [eventId, user, fetchEventById, hasJoinedEvent]);

  const handleJoinEvent = async () => {
    if (!user || !selectedEvent) return;

    try {
      if (isJoined) {
        await leaveEvent(selectedEvent.id, user.id);
        setIsJoined(false);
        toast.success('You have left the event');
      } else {
        await joinEvent(selectedEvent.id, user.id);
        setIsJoined(true);
        toast.success('Successfully joined the event!');
      }
    } catch (error) {
      toast.error('Failed to update event attendance');
    }
  };

  const handleShare = async () => {
    if (!selectedEvent) return;

    try {
      await navigator.share({
        title: selectedEvent.title,
        text: selectedEvent.description,
        url: window.location.href,
      });
    } catch (error) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Event link copied to clipboard!');
    }
  };

  const handleGetDirections = () => {
    if (!selectedEvent) return;

    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`;
    window.open(url, '_blank');
  };

  const handleCheckIn = () => {
    if (!selectedEvent) return;
    router.push(`/event/${selectedEvent.id}/checkin`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const category = EVENT_CATEGORIES.find(cat => cat.value === selectedEvent.category);
  const status = getEventStatus(selectedEvent);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="pb-20 md:pb-6">
        {/* Hero Image */}
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-orange-400 to-red-500 overflow-hidden">
          {selectedEvent.image_url ? (
            <img
              src={selectedEvent.image_url}
              alt={selectedEvent.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-500 to-pink-500">
              <span className="text-8xl">{category?.icon || '🔥'}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute top-4 left-4">
            <Badge variant={status === 'Today' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </div>

          <div className="absolute top-4 right-4 flex gap-2">
            {user && selectedEvent.organizer_id === user.id && (
              <Button
                size="sm"
                variant="secondary"
                className="h-10 w-10 rounded-full p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                onClick={() => router.push(`/organizer/edit/${selectedEvent.id}`)}
              >
                <Edit className="h-4 w-4 text-white" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 text-white" />
            </Button>
          </div>

          {/* Crowd badge removed */}
        </div>

        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white break-words whitespace-normal">
              {selectedEvent.title}
            </h1>

            {/* Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Calendar className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{formatDate(selectedEvent.date)}</p>
                    <p className="text-sm">Date</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Clock className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{formatTime(selectedEvent.time)}</p>
                    <p className="text-sm">Time</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <Users className="h-5 w-5" />
                  <div>
                    <p className="font-medium">
                      {selectedEvent.attendees_count} going
                      {selectedEvent.max_attendees && ` / ${selectedEvent.max_attendees} max`}
                    </p>
                    <p className="text-sm">Attendees</p>
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                  <MapPin className="h-5 w-5 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{selectedEvent.location}</p>
                    <p className="text-sm">Location</p>
                  </div>
                </div>
                
                {/* Interactive Map Preview */}
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${selectedEvent.latitude},${selectedEvent.longitude}&zoom=15`}
                    allowFullScreen
                  />
                  {/* Overlay to prevent interaction (optional) */}
                  <div 
                    className="absolute inset-0 cursor-pointer"
                    onClick={handleGetDirections}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGetDirections}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border">
              <h2 className="text-xl font-semibold mb-3">About This Event</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed break-words whitespace-pre-wrap">
                {selectedEvent.description}
              </p>
            </div>

            {selectedEvent.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={handleJoinEvent}
              >
                {isJoined ? 'Leave Event' : 'Join Event'}
              </Button>

              {isJoined && (
                <Button variant="outline" className="flex-1" onClick={handleCheckIn}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Check In
                </Button>
              )}
            </div>

            {/* Organizer Footer */}
            {organizerName && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Organized by{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {organizerName}
                  </span>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
