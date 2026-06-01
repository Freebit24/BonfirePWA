'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Edit } from 'lucide-react';
import { Event } from '@/types';
import { formatDate, formatTime, getEventStatus, isEventUpcoming } from '@/utils/helpers';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Heart,
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onJoin?: () => void;
  onLeave?: () => void;
  onShare?: () => void;
  isJoined?: boolean;
  className?: string;
}

export function EventCard({ 
  event, 
  onJoin, 
  onLeave, 
  onShare, 
  isJoined = false,
  className 
}: EventCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const category = EVENT_CATEGORIES.find(cat => cat.value === event.category);
  const status = getEventStatus(event);
  const canJoin = event.status === 'active' && isEventUpcoming(event.date, event.time);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full", className)}
    >
      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        {/* Event Image */}
        <div className="relative h-48 bg-gradient-to-r from-orange-400 to-red-500 overflow-hidden">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-400 via-red-500 to-pink-500">
              <span className="text-6xl">{category?.icon || '🔥'}</span>
            </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={status === 'Today' ? 'default' : 'secondary'}>
              {status}
            </Badge>
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-full p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
            >
              <Heart 
                className={cn(
                  "h-4 w-4 transition-colors",
                  isLiked ? "fill-red-500 text-red-500" : "text-white"
                )}
              />
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 rounded-full p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
            >
              <Share2 className="h-4 w-4 text-white" />
            </Button>
            {/* Edit button visible to organizer only */}
            {user && user.id === event.organizer_id && (
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 rounded-full p-0 bg-white/20 backdrop-blur-sm hover:bg-white/30"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/organizer/edit/${event.id}`);
                }}
              >
                <Edit className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>
          
          {/* Category Badge */}
          <div className="absolute bottom-3 left-3">
            <Badge 
              variant="secondary" 
              className="bg-white/90 text-gray-800 backdrop-blur-sm font-medium"
            >
              {category?.icon} {category?.label || event.category}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Event Title */}
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900 dark:text-white break-words whitespace-normal">
            {event.title}
          </h3>
          
          {/* Event Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(event.date)}</span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{formatTime(event.time)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>
                {event.attendees_count} going
                {event.max_attendees && ` / ${event.max_attendees} max`}
              </span>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 break-words whitespace-normal">
            {event.description}
          </p>
          
          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {event.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {event.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{event.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Join Button (hidden if event ended/cancelled/completed) */}
          {canJoin ? (
            <Button
              className={cn(
                "w-full transition-all duration-200",
                isJoined
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                isJoined ? onLeave?.() : onJoin?.();
              }}
            >
              {isJoined ? 'Joined' : 'Join Event'}
            </Button>
          ) : (
            <div className="w-full text-center py-2 text-sm text-muted-foreground">
              {status === 'Cancelled' ? 'Event cancelled' : status === 'Completed' ? 'Event completed' : 'Event ended'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
