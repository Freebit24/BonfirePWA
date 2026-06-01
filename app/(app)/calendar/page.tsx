'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/utils/supabase';
import { Event } from '@/types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent extends Event {
  isOrganizer: boolean;
  isAttendee: boolean;
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    loadEvents();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch events the user has joined
      const { data: attendedEvents, error: attendedError } = await db
        .from('event_attendees')
        .select('event_id')
        .eq('user_id', user.id);

      if (attendedError) throw attendedError;

      const attendedEventIds = attendedEvents?.map(a => a.event_id) || [];

      // Fetch events organized by the user
      const { data: organizedEvents, error: organizedError } = await db
        .from('events')
        .select('*')
        .eq('organizer_id', user.id);

      if (organizedError) throw organizedError;

      // Fetch attended event details
      let attendedEventDetails: Event[] = [];
      if (attendedEventIds.length > 0) {
        const { data: eventsData, error: eventsError } = await db
          .from('events')
          .select('*')
          .in('id', attendedEventIds);

        if (eventsError) throw eventsError;
        attendedEventDetails = eventsData || [];
      }

      // Combine and mark events
      const organizedIds = new Set(organizedEvents?.map(e => e.id) || []);
      const attendedIds = new Set(attendedEventIds);

      const allEvents: CalendarEvent[] = [];
      const seenIds = new Set();

      // Add organized events
      (organizedEvents || []).forEach((event: Event) => {
        if (!seenIds.has(event.id)) {
          allEvents.push({
            ...event,
            isOrganizer: true,
            isAttendee: attendedIds.has(event.id),
          });
          seenIds.add(event.id);
        }
      });

      // Add attended events (that aren't already added)
      attendedEventDetails.forEach((event: Event) => {
        if (!seenIds.has(event.id)) {
          allEvents.push({
            ...event,
            isOrganizer: false,
            isAttendee: true,
          });
          seenIds.add(event.id);
        }
      });

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    setSelectedDateEvents(getEventsForDate(clickedDate));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleAddToGoogleCalendar = (event: CalendarEvent) => {
    const startDateTime = new Date(`${event.date}T${event.time}`);
    const endDateTime = event.end_date && event.end_time 
      ? new Date(`${event.end_date}T${event.end_time}`)
      : new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}`;

    window.open(googleCalendarUrl, '_blank');
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
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

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-bold mb-2">Event Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400">
              View all your events and add them to Google Calendar
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      {monthName} {year}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                      >
                        Today
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNextMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
                      >
                        {day}
                      </div>
                    ))}

                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Calendar days */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dayEvents = getEventsForDate(new Date(year, month, day));
                      const hasEvents = dayEvents.length > 0;
                      const isTodayDate = isToday(day);
                      const isSelected = selectedDate?.getDate() === day && 
                                       selectedDate?.getMonth() === month &&
                                       selectedDate?.getFullYear() === year;

                      return (
                        <button
                          key={day}
                          onClick={() => handleDateClick(day)}
                          className={`
                            aspect-square p-2 rounded-lg border transition-all
                            ${isTodayDate ? 'bg-orange-500 text-white font-bold' : ''}
                            ${isSelected && !isTodayDate ? 'bg-blue-100 dark:bg-blue-900 border-blue-500' : ''}
                            ${!isTodayDate && !isSelected ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                            ${hasEvents && !isTodayDate && !isSelected ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-700'}
                          `}
                        >
                          <div className="text-sm">{day}</div>
                          {hasEvents && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {dayEvents.slice(0, 3).map((event, idx) => (
                                <div
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    event.isOrganizer
                                      ? 'bg-purple-500'
                                      : 'bg-green-500'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Organized</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Attending</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Event Details Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <Card className="top-20">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate
                      ? selectedDate.toLocaleDateString('default', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Select a date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    selectedDateEvents.length > 0 ? (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {selectedDateEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 
                                className="font-semibold text-sm cursor-pointer hover:text-orange-500"
                                onClick={() => router.push(`/event/${event.id}`)}
                              >
                                {event.title}
                              </h3>
                              <div className="flex gap-1">
                                {event.isOrganizer && (
                                  <Badge variant="secondary" className="text-xs">
                                    Organizer
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{event.time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs"
                                onClick={() => router.push(`/event/${event.id}`)}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1 text-xs bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                                onClick={() => handleAddToGoogleCalendar(event)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Add to Google
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No events on this day</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click on a date to view events</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Total Events
                      </span>
                      <span className="font-bold">{events.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Organizing
                      </span>
                      <span className="font-bold text-purple-500">
                        {events.filter(e => e.isOrganizer).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Attending
                      </span>
                      <span className="font-bold text-green-500">
                        {events.filter(e => e.isAttendee && !e.isOrganizer).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
