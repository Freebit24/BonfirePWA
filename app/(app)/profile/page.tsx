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
            <Card className="border-0 shadow-lg mb-4 relative">
              <CardContent className="p-4">
                <div className="flex flex-row items-start gap-4 text-left">
                  {isReady ? (
                    <>
                      <Avatar className="w-20 h-20 flex-shrink-0">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {user.user_metadata?.name?.[0] || user.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-white mb-2 truncate md:text-4xl md:mb-3">
                          {user.user_metadata?.name || 'User'}
                        </h1>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full md:gap-2 md:px-4 md:py-1.5">
                            <Calendar className="h-3 w-3 text-orange-500 md:h-4 md:w-4" />
                            <span className="text-[10px] text-gray-300 md:text-sm">Joined {formatDate(user.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full md:gap-2 md:px-4 md:py-1.5">
                            <Trophy className="h-3 w-3 text-orange-500 md:h-4 md:w-4" />
                            <span className="text-[10px] text-gray-300 md:text-sm">Enthusiast</span>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push('/settings')} 
                        className="h-10 w-10 flex-shrink-0 hover:opacity-70 transition-opacity bg-transparent p-2 md:h-12 md:w-12"
                      >
                        <Settings className="h-4 w-4 md:h-6 md:w-6" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-20 h-20 rounded-full bg-muted/20 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-32 bg-muted/20 animate-pulse rounded" />
                        <div className="flex gap-1.5">
                          <div className="h-6 w-28 bg-muted/20 animate-pulse rounded-full" />
                          <div className="h-6 w-24 bg-muted/20 animate-pulse rounded-full" />
                        </div>
                      </div>
                      <div className="h-10 w-10 bg-muted/20 animate-pulse rounded flex-shrink-0" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Strip */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden text-white mb-8">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              {/* Events Attended */}
              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">{stats.eventsJoined}</div>
                <div className="text-xs text-gray-500">Attended</div>
                <div className="text-[10px] text-slate-400">Past events</div>
              </div>

              {/* Events Organized */}
              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">{stats.eventsHosted}</div>
                <div className="text-xs text-gray-500">Organized</div>
                <div className="text-[10px] text-slate-400">As host</div>
              </div>

              {/* Check-ins */}
              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">{stats.totalCheckIns}</div>
                <div className="text-xs text-gray-500">Check-ins</div>
                <div className="text-[10px] text-slate-400">All time</div>
              </div>
            </div>
          </div>

          {/* Events Tabs - Line Style */}
          <div className="flex gap-8 border-b border-white/10 w-full mb-6">
            <Tabs defaultValue="past" className="w-full">
              <TabsList className="flex gap-8 border-b border-0 bg-transparent w-full p-0 h-auto">
                <TabsTrigger value="past" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none">
                  Past Events {pastEvents.length > 0 && `(${pastEvents.length})`}
                </TabsTrigger>
                <TabsTrigger value="joined" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none">
                  Joined Events {joinedEvents.length > 0 && `(${joinedEvents.length})`}
                </TabsTrigger>
                <TabsTrigger value="organised" className="px-0 py-3 border-0 bg-transparent text-gray-400 hover:text-white data-[state=active]:text-orange-500 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent rounded-none">
                  Organised Events {organisedEvents.length > 0 && `(${organisedEvents.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="past" className="space-y-6 mt-6">
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

            <TabsContent value="joined" className="space-y-6 mt-6">
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

            <TabsContent value="organised" className="space-y-6 mt-6">
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
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
