'use client';

import { useState } from 'react';
import { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  Flame,
  Lock,
} from 'lucide-react';
import { formatDate, formatTime } from '@/utils/helpers';

interface MapSideMenuProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventSelect?: (event: Event) => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export function MapSideMenu({
  events,
  onEventClick,
  onEventSelect,
  isOpen = true,
  onToggle,
}: MapSideMenuProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sort events by date and time in ascending order (earliest first)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  const handleEventSelectClick = (event: Event) => {
    setSelectedEventId(event.id);
    // Trigger zoom/map interaction
    if (onEventSelect) {
      onEventSelect(event);
    }
  };

  const handleViewDetails = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEventClick(event);
  };

  return (
    <>
      {/* Toggle Button - Hidden when menu is open */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => onToggle?.(true)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            title="Open events menu"
          >
            <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Side Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-30 flex flex-col rounded-r-lg overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5" />
                <h2 className="font-bold text-lg">Active Events</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle?.(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            {/* Events List */}
            <div className="flex-1 overflow-y-auto">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Flame className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    No active events
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Try adjusting your filters
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {sortedEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={cn(
                          'p-3 cursor-pointer transition-all border-2',
                          selectedEventId === event.id
                            ? event.visibility === 'private'
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : event.visibility === 'private'
                            ? 'border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 bg-purple-50/30 dark:bg-purple-900/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600'
                        )}
                        onClick={() => handleEventSelectClick(event)}
                      >
                        <div className="flex gap-3">
                          {/* Event Image Thumbnail */}
                          <div className="flex-shrink-0">
                            {event.image_url ? (
                              <img
                                src={event.image_url}
                                alt={event.title}
                                className="w-16 h-16 rounded-md object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-md bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                <Flame className="h-8 w-8 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Event Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                              {event.title}
                            </h3>

                            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span className="line-clamp-1">
                                  {formatDate(event.date)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                <span>{formatTime(event.time)}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="line-clamp-1">
                                  {event.location}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 flex-shrink-0" />
                                <span>
                                  {event.attendees_count}
                                  {event.max_attendees &&
                                    ` / ${event.max_attendees}`}
                                </span>
                              </div>
                            </div>

                            {/* Category Badge and View Details Button */}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {event.visibility === 'private' && (
                                <Badge variant="destructive" className="text-xs bg-purple-600 hover:bg-purple-700 flex-shrink-0">
                                  <Lock className="h-2.5 w-2.5 mr-1" />
                                  Private
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {event.category}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs px-1 ml-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 flex-shrink-0"
                                onClick={(e) => handleViewDetails(event, e)}
                              >
                                View →
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 dark:text-gray-400 text-center flex-shrink-0">
              {events.length} event{events.length !== 1 ? 's' : ''} in the area
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper function for classNames
function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
