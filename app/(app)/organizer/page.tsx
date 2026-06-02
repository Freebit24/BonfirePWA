'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { EventCard } from '@/components/common/event-card';
import { SearchInput } from '@/components/common/search-input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { Plus, Calendar, Users, TrendingUp, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { isEventUpcoming } from '@/utils/helpers';
import { toast } from 'sonner';

export default function OrganizerPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { events, fetchEvents, deleteEvent, joinEvent, leaveEvent, hasJoinedEvent } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [organizerSearch, setOrganizerSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [joinedEvents, setJoinedEvents] = useState<Record<string, boolean>>({});
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [eventToLeave, setEventToLeave] = useState<string | null>(null);

  // Filter events organized by current user
  const myEvents = events.filter(event => event.organizer_id === user?.id);

  // Local filtered list for organizer search with sorting
  const filteredMyEvents = myEvents.filter(event => {
    const q = organizerSearch.trim().toLowerCase();
    if (!q) return true;
    const inText =
      event.title.toLowerCase().includes(q) ||
      event.description.toLowerCase().includes(q) ||
      event.location.toLowerCase().includes(q);
    const inTags = event.tags?.some(tag => tag.toLowerCase().includes(q));
    return inText || inTags;
  }).sort((a, b) => {
    // Sort by created_at timestamp (assuming events have this field)
    // If not available, use id or another timestamp field
    const dateA = new Date(a.created_at || a.id).getTime();
    const dateB = new Date(b.created_at || b.id).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  useEffect(() => {
    if (user) {
      fetchEvents().then(() => setLoading(false));
    }
  }, [user, fetchEvents]);

  useEffect(() => {
    const checkJoinedStatus = async () => {
      if (!user || myEvents.length === 0) return;
      const joined: Record<string, boolean> = {};
      for (const event of myEvents) {
        joined[event.id] = await hasJoinedEvent(event.id, user.id);
      }
      setJoinedEvents(joined);
    };
    checkJoinedStatus();
  }, [user, myEvents.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteEvent(eventId);
        toast.success('Event deleted successfully');
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    // Find the event from the organizer's list of events
    const event = myEvents.find(e => e.id === eventId);

    // 1. Check for event capacity
    if (event?.max_attendees && event.attendees_count >= event.max_attendees) {
      toast.error('This event has reached maximum capacity');
      return;
    }

    // 2. Check for private event approval requirement
    if (event?.is_private && event?.require_approval) {
      toast.info("This is a private event. Please visit the event page to request to join.");
      return;
    }
    
    try {
      const ok = await joinEvent(eventId, user.id);
      if (ok) {
        setJoinedEvents(prev => ({ ...prev, [eventId]: true }));
        toast.success('Successfully joined the event!');
      } else {
        // Re-check capacity in case of a race condition
        const updatedEvent = myEvents.find(e => e.id === eventId);
        if (updatedEvent?.max_attendees && updatedEvent.attendees_count >= updatedEvent.max_attendees) {
          toast.error('This event has reached maximum capacity');
        } else {
          toast.error('Unable to join event');
        }
      }
    } catch {
      toast.error('Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setEventToLeave(eventId);
    setShowLeaveDialog(true);
  };

  const confirmLeave = async () => {
    if (!user || !eventToLeave) return;
    try {
      const ok = await leaveEvent(eventToLeave, user.id);
      if (ok) {
        setJoinedEvents(prev => ({ ...prev, [eventToLeave]: false }));
        toast.success('You have left the event');
      } else {
        toast.error('Failed to leave event');
      }
    } catch {
      toast.error('Failed to leave event');
    } finally {
      setShowLeaveDialog(false);
      setEventToLeave(null);
    }
  };

  const stats = {
    totalEvents: myEvents.length,
    totalAttendees: myEvents.reduce((sum, event) => sum + event.attendees_count, 0),
    // activeEvents: only count events with status 'active' that are still upcoming
    activeEvents: myEvents.filter(event => event.status === 'active' && isEventUpcoming(event.date, event.time)).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:py-10 md:pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-start md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold md:text-4xl">Organizer Dashboard</h1>
              <p className="text-sm text-slate-400 md:text-base">Manage your events and track engagement</p>
            </div>

            <button
              onClick={() => router.push('/organizer/create')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg text-sm md:text-base font-medium flex items-center gap-1 md:gap-2 shadow-sm transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
              <span className="md:hidden">Create</span>
              <span className="hidden md:inline">Create Event</span>
            </button>
          </div>

          {/* Stats Strip */}
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden text-white mb-4 md:mb-6">
            <div className="grid grid-cols-3 divide-x divide-white/10">
              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">{stats.totalEvents}</div>
                <div className="text-xs text-gray-500">Events</div>
                <div className="text-[10px] text-emerald-400">{stats.activeEvents} active</div>
              </div>

              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">{stats.totalAttendees}</div>
                <div className="text-xs text-gray-500">Attendees</div>
                <div className="text-[10px] text-slate-400">All time</div>
              </div>

              <div className="flex flex-col items-start px-4 py-3 gap-1 md:px-5 md:py-4">
                <div className="text-3xl font-extrabold leading-none">
                  {stats.totalEvents > 0 ? Math.round(stats.totalAttendees / stats.totalEvents) : 0}
                </div>
                <div className="text-xs text-gray-500">Avg. Attendance</div>
                <div className="text-[10px] text-slate-400">Per event</div>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-3 md:space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex-shrink-0">
                  <h2 className="text-xl font-semibold md:text-2xl">Your Events</h2>
                  <p className="text-xs text-gray-600 dark:text-gray-400 md:text-sm">
                    {filteredMyEvents.length} of {myEvents.length} event{myEvents.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:gap-3 md:w-auto">
                  <div className="flex-1">
                    <SearchInput
                      value={organizerSearch}
                      onChange={setOrganizerSearch}
                      placeholder="Search your events..."
                      className="w-full"
                      inputClassName="h-11 min-h-[44px]"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                    className="h-11 w-11 min-h-[44px] md:w-auto md:px-4 border border-input bg-background text-slate-300 hover:text-white"
                    aria-label="Sort events"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    <span className="hidden md:inline md:ml-2 text-sm">
                      {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </span>
                  </Button>
                </div>
              </div>

            {myEvents.length === 0 ? (
              <div className="text-center py-8 px-4 md:py-12">
                <div className="text-5xl mb-3 md:text-6xl md:mb-4">🎪</div>
                <h3 className="text-lg font-semibold mb-2 md:text-xl">No events yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 md:text-base">
                  Create your first event to get started as an organizer
                </p>
                <Button
                  onClick={() => router.push('/organizer/create')}
                  className="w-full min-h-[44px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white md:w-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Event
                </Button>
              </div>
            ) : filteredMyEvents.length === 0 ? (
              <div className="text-center py-8 px-4 md:py-12">
                <h3 className="text-lg font-semibold mb-2 md:text-xl">No events match</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 md:text-base">
                  Try adjusting your search to find your events
                </p>
                <Button
                  onClick={() => setOrganizerSearch('')}
                  className="w-full min-h-[44px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white md:w-auto"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max md:gap-5 lg:gap-6">
                {filteredMyEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                    onClick={() => router.push(`/event/${event.id}`)}
                  >
                    <EventCard 
                      event={event}
                      isDashboardView={true}
                      currentUserId={user?.id || null}
                      isJoined={joinedEvents[event.id] || false}
                      onJoin={() => handleJoinEvent(event.id)}
                      onLeave={() => handleLeaveEvent(event.id)}
                      onShare={() => {
                        navigator.share({
                          title: event.title,
                          text: event.description,
                          url: `${window.location.origin}/event/${event.id}`,
                        });
                      }}
                      onDelete={() => handleDeleteEvent(event.id)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this event? You can always join again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              Leave Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
