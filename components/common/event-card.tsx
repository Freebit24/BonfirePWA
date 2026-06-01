'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Edit, Trash2 } from 'lucide-react';
import { Event } from '@/types';
import { formatDate, formatTime, getEventStatus, isEventUpcoming } from '@/utils/helpers';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Share2,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onJoin?: () => void;
  onLeave?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  isJoined?: boolean;
  className?: string;
  showOrganizerActions?: boolean;
  // NEW: distinguish between Home Feed and Organizer Dashboard
  isDashboardView?: boolean;
  // Optional explicit current user id; falls back to auth store user
  currentUserId?: string | null;
}

export function EventCard({ 
  event, 
  onJoin, 
  onLeave, 
  onShare, 
  onDelete,
  isJoined = false,
  className,
  showOrganizerActions = true,
  isDashboardView = false,
  currentUserId
}: EventCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  // removed favourite state/button to avoid duplicates and overlap
  const category = EVENT_CATEGORIES.find(cat => cat.value === event.category);
  const status = getEventStatus(event);
  const canJoin = event.status === 'active' && isEventUpcoming(
    event.date,
    event.time,
    event.end_date,
    event.end_time
  );
  const effectiveUserId = currentUserId ?? user?.id ?? null;
  const isOrganizer = !!effectiveUserId && effectiveUserId === event.organizer_id;

  return (
    <div className={cn("w-full h-full", className)}>
      <Card className={cn(
        "overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-white/20 h-full flex flex-col border",
        event.visibility === 'private'
          ? "border-fuchsia-500/40 bg-gradient-to-br from-purple-950 to-indigo-900"
          : "border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-800"
      )}>
        {/* Event Image - 16:9 aspect ratio */}
        <div className="relative aspect-video bg-gradient-to-r from-orange-400 to-red-500 overflow-hidden flex items-center justify-center flex-shrink-0">
          {event.image_url ? (
            <Image 
              src={event.image_url} 
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              onError={() => {
                // Gracefully fallback to icon - container already has background
                logger.warn('Card image failed to load:', event.image_url);
              }}
            />
          ) : (
            <span className="text-6xl z-10">{category?.icon || '🔥'}</span>
          )}
          
          {/* Status Badges - Top Right (Glassmorphism) */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="backdrop-blur-md bg-black/40 border border-white/10 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {status}
            </span>
            {event.visibility === 'private' && (
              <span className="backdrop-blur-md bg-fuchsia-600/20 border border-fuchsia-400/30 text-fuchsia-200 text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center">
                <Lock className="h-3 w-3 mr-1 text-fuchsia-300" />
                Private
              </span>
            )}
          </div>
          
          {/* Action Buttons: Edit (organizer), Share (all), Delete (organizer) - Bottom Right */}
          {(showOrganizerActions && user && user.id === event.organizer_id) || onShare ? (
            <div className="absolute bottom-3 right-3 flex gap-2 flex-nowrap z-10">
              {showOrganizerActions && user && user.id === event.organizer_id && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 min-w-8 rounded-full p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/organizer/edit/${event.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4 text-gray-700" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 min-w-8 rounded-full p-0 bg-white/90 backdrop-blur-sm hover:bg-red-500 shadow-lg transition-all hover:scale-110"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-700 group-hover:text-white" />
                  </Button>
                </>
              )}

              {onShare && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 min-w-8 rounded-full p-0 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.();
                  }}
                >
                  <Share2 className="h-4 w-4 text-gray-700" />
                </Button>
              )}
            </div>
          ) : null}
          
          {/* Category Badge with Glassmorphism */}
          <div className="absolute top-3 left-3">
            <span className="backdrop-blur-md bg-black/40 border border-white/10 text-white text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1">
              {category?.icon} {category?.label || event.category}
            </span>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Date */}
          <div className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-2">
            {formatDate(event.date)} · {formatTime(event.time)}
          </div>
          
          {/* Title */}
          <h3 className="text-white text-lg font-semibold leading-tight mb-1 line-clamp-2 break-words">
            {event.title}
          </h3>
          
          {/* Location */}
          <div className="text-slate-400 text-sm flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-4">
            {/* Left: Attendees */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {/* Placeholder avatars - you can render actual attendee avatars here */}
                <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-gray-900" />
                <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-gray-900" />
                <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-gray-900" />
              </div>
              <span className="text-xs text-gray-400">
                {event.attendees_count} going
              </span>
            </div>
            
            {/* Right: Primary action area (Dashboard vs Home Feed) */}
            {isDashboardView ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/event/${event.id}`);
                }}
              >
                Manage
              </Button>
            ) : isOrganizer ? (
              <span className="border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs">
                Hosting
              </span>
            ) : canJoin ? (
              isJoined ? (
                <span className="border border-green-500/30 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs">
                  Going
                </span>
              ) : (
                <Button
                  className="bg-white text-black hover:bg-gray-200 px-5 py-2 rounded-full font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoin?.();
                  }}
                  disabled={!!event.max_attendees && event.attendees_count >= event.max_attendees}
                >
                  {(event.max_attendees && event.attendees_count >= event.max_attendees) ? 'Full' : 'Join'}
                </Button>
              )
            ) : (
              <span className="border border-slate-500/30 bg-slate-500/10 text-slate-400 px-3 py-1 rounded-full text-xs">
                {status}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
