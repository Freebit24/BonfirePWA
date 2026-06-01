'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { EventCard } from '@/components/common/event-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { formatDate, isEventUpcoming } from '@/utils/helpers';
import { db } from '@/utils/supabase';
import { Event } from '@/types';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  User,
  Calendar,
  MapPin,
  Clock,
  Settings,
  Edit,
  Trophy,
  Star
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { events, fetchEvents, joinEvent, leaveEvent, hasJoinedEvent } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [organisedEvents, setOrganisedEvents] = useState<Event[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([]);
  const [joinedEventsMap, setJoinedEventsMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Fetch all events
        await fetchEvents();

        // Fetch events the user has joined
        const { data: attendedEvents, error: attendedError } = await db
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', user.id);

        if (attendedError) throw attendedError;

        const attendedEventIds = attendedEvents?.map(a => a.event_id) || [];

        // Fetch the actual event details for attended events
        if (attendedEventIds.length > 0) {
          const { data: eventsData, error: eventsError } = await db
            .from('events')
            .select('*')
            .in('id', attendedEventIds);

          if (eventsError) throw eventsError;

          const now = new Date();
          const past = (eventsData || []).filter((event: Event) => {
            const eventEndDateTime = new Date(`${event.end_date || event.date}T${event.end_time || event.time}`);
            return eventEndDateTime < now;
          });

          const upcomingOrLive = (eventsData || []).filter((event: Event) =>
            isEventUpcoming(event.date, event.time, (event as any).end_date, (event as any).end_time)
          );

          setPastEvents(past as Event[]);
          setJoinedEvents(upcomingOrLive as Event[]);

          // Mark attended events as joined
          setJoinedEventsMap(prev => {
            const next = { ...prev };
            attendedEventIds.forEach(id => { next[id] = true; });
            return next;
          });
        }

        // Fetch events organized by the user
        const { data: organized, error: organizedError } = await db
          .from('events')
          .select('*')
          .eq('organizer_id', user.id);

        if (organizedError) throw organizedError;

        setOrganisedEvents(organized as Event[] || []);

        // Check joined status for organized events
        const joinedMap: Record<string, boolean> = {};
        for (const event of organized || []) {
          joinedMap[event.id] = await hasJoinedEvent(event.id, user.id);
        }
        setJoinedEventsMap(prev => ({ ...prev, ...joinedMap }));

      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, fetchEvents]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    
    // Find the event to check capacity (check in all event lists)
    const event = [...joinedEvents, ...organisedEvents].find(e => e.id === eventId);
    if (event?.max_attendees && event.attendees_count >= event.max_attendees) {
      toast.error('This event has reached maximum capacity');
      return;
    }
    
    try {
      const ok = await joinEvent(eventId, user.id);
      if (ok) {
        setJoinedEventsMap(prev => ({ ...prev, [eventId]: true }));
        toast.success('Successfully joined the event!');
      } else {
        // Check if the event is now full (in case of race condition)
        const updatedEvent = [...joinedEvents, ...organisedEvents].find(e => e.id === eventId);
        if (updatedEvent?.max_attendees && updatedEvent.attendees_count >= updatedEvent.max_attendees) {
          toast.error('This event has reached maximum capacity');
        } else {
          toast.error('Unable to join event');
        }
      }
    } catch (error) {
      console.error('Failed to join event:', error);
      toast.error('Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const ok = await leaveEvent(eventId, user.id);
      if (ok) {
        setJoinedEventsMap(prev => ({ ...prev, [eventId]: false }));
      }
    } catch (error) {
      console.error('Failed to leave event:', error);
    }
  };

  // Keep page structure mounted to allow shared-layout animations
  const isReady = !loading && !!user;
  if (!user) {
    return null;
  }

  const stats = {
    eventsJoined: pastEvents.length,
    eventsHosted: organisedEvents.length,
    totalCheckIns: pastEvents.length,
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {isReady ? (
                    <>
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="text-2xl">
                          {user.user_metadata?.name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">
                          {user.user_metadata?.name || 'User'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {user.email}
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                          <Badge variant="secondary">
                            <Calendar className="h-3 w-3 mr-1" />
                            Joined {formatDate(user.created_at)}
                          </Badge>
                          <Badge variant="secondary">
                            <Trophy className="h-3 w-3 mr-1" />
                            Event Enthusiast
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push('/settings')}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-6 w-full">
                      <div className="w-24 h-24 rounded-full bg-muted/20 animate-pulse" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 w-48 bg-muted/20 animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted/20 animate-pulse rounded" />
                        <div className="flex gap-2">
                          <div className="h-6 w-32 bg-muted/20 animate-pulse rounded" />
                          <div className="h-6 w-28 bg-muted/20 animate-pulse rounded" />
                        </div>
                      </div>
                      <div className="h-9 w-24 bg-muted/20 animate-pulse rounded" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isReady ? (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.eventsJoined}</div>
                    <p className="text-xs text-muted-foreground">Past events</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Events Organized</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.eventsHosted}</div>
                    <p className="text-xs text-muted-foreground">As organizer</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                    <p className="text-xs text-muted-foreground">Total attended</p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <div className="h-28 rounded-lg bg-muted/20 animate-pulse" />
                <div className="h-28 rounded-lg bg-muted/20 animate-pulse" />
                <div className="h-28 rounded-lg bg-muted/20 animate-pulse" />
              </>
            )}
          </div>

          {/* Events Tabs */}
          <Tabs defaultValue="past" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="past">Past Events</TabsTrigger>
              <TabsTrigger value="joined">Joined Events</TabsTrigger>
              <TabsTrigger value="organised">Organised Events</TabsTrigger>
            </TabsList>

            <TabsContent value="past" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Past Events</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pastEvents.length} event{pastEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {!isReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ) : pastEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold mb-2">No past events</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Events you&apos;ve attended will appear here
                  </p>
                  <Button
                    onClick={() => router.push('/home')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Explore Events
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                  {pastEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/event/${event.id}`, { scroll: false })}
                      className="cursor-pointer"
                    >
                      <EventCard
                        event={event}
                         isJoined={joinedEventsMap[event.id] || false}
                        onShare={() => {
                          navigator.share?.({
                            title: event.title,
                            text: event.description,
                            url: `${window.location.origin}/event/${event.id}`,
                          });
                        }}
                        showOrganizerActions={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="joined" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Joined Events</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {joinedEvents.length} event{joinedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {!isReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ) : joinedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🧭</div>
                  <h3 className="text-xl font-semibold mb-2">No upcoming joined events</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Join an event to see it here.
                  </p>
                  <Button
                    onClick={() => router.push('/home')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Browse Events
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                  {joinedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/event/${event.id}`, { scroll: false })}
                      className="cursor-pointer"
                    >
                      <EventCard
                        event={event}
                         isJoined={true}
                        onShare={() => {
                          navigator.share?.({
                            title: event.title,
                            text: event.description,
                            url: `${window.location.origin}/event/${event.id}`,
                          });
                        }}
                        showOrganizerActions={false}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="organised" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Organised Events</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {organisedEvents.length} event{organisedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {!isReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-48 rounded-lg bg-muted/20 animate-pulse" />
                  ))}
                </div>
              ) : organisedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎪</div>
                  <h3 className="text-xl font-semibold mb-2">No organized events</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first event to get started
                  </p>
                  <Button
                    onClick={() => router.push('/organizer/create')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Create Event
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
                  {organisedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/event/${event.id}`, { scroll: false })}
                      className="cursor-pointer"
                    >
                      <EventCard
                        event={event}
                        isJoined={joinedEventsMap[event.id] || false}
                        onJoin={() => handleJoinEvent(event.id)}
                        onLeave={() => handleLeaveEvent(event.id)}
                        onShare={() => {
                          navigator.share?.({
                            title: event.title,
                            text: event.description,
                            url: `${window.location.origin}/event/${event.id}`,
                          });
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
