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
import { formatDate } from '@/utils/helpers';
import { db } from '@/utils/supabase';
import { Event } from '@/types';
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
  const [joinedEventsMap, setJoinedEventsMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Fetch all events
        await fetchEvents();

        // Fetch events the user has joined (past events only)
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

          // Filter for past events (events that have ended)
          const now = new Date();
          const past = (eventsData || []).filter((event: Event) => {
            const eventEndDateTime = new Date(`${event.end_date || event.date}T${event.end_time || event.time}`);
            return eventEndDateTime < now;
          });

          setPastEvents(past as Event[]);
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
        setJoinedEventsMap(joinedMap);

      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, fetchEvents, hasJoinedEvent]);

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const ok = await joinEvent(eventId, user.id);
      if (ok) {
        setJoinedEventsMap(prev => ({ ...prev, [eventId]: true }));
      }
    } catch (error) {
      console.error('Failed to join event:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = {
    eventsJoined: pastEvents.length,
    eventsHosted: organisedEvents.length,
    totalCheckIns: pastEvents.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/settings')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">    
                <CardTitle className="text-sm font-medium">Events Attended</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.eventsJoined}</div>
                <p className="text-xs text-muted-foreground">
                  Past events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">    
                <CardTitle className="text-sm font-medium">Events Organized</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.eventsHosted}</div>
                <p className="text-xs text-muted-foreground">
                  As organizer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">    
                <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCheckIns}</div>
                <p className="text-xs text-muted-foreground">
                  Total attended
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Events Tabs */}
          <Tabs defaultValue="past" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="past">Past Events</TabsTrigger>
              <TabsTrigger value="organised">Organised Events</TabsTrigger>
            </TabsList>

            <TabsContent value="past" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Past Events</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pastEvents.length} event{pastEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {pastEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold mb-2">No past events</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Events you've attended will appear here
                  </p>
                  <Button
                    onClick={() => router.push('/home')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Explore Events
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/event/${event.id}`)}
                      className="cursor-pointer"
                    >
                      <EventCard
                        event={event}
                        onShare={() => {
                          navigator.share({
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

            <TabsContent value="organised" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Organised Events</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {organisedEvents.length} event{organisedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {organisedEvents.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {organisedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => router.push(`/event/${event.id}`)}
                      className="cursor-pointer"
                    >
                      <EventCard
                        event={event}
                        isJoined={joinedEventsMap[event.id] || false}
                        onJoin={() => handleJoinEvent(event.id)}
                        onLeave={() => handleLeaveEvent(event.id)}
                        onShare={() => {
                          navigator.share({
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
