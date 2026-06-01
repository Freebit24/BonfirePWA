'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Profile } from '@/types';
import { Mail, Phone, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface OrganizerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  isLoading?: boolean;
}

export default function OrganizerProfileModal({
  isOpen,
  onClose,
  profile,
  isLoading = false,
}: OrganizerProfileModalProps) {
  // Set up focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!profile) return null;

  const getInitials = (name?: string, username?: string): string => {
    if (name) {
      return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    return '?';
  };

  const displayName = profile.full_name || profile.username || 'Organizer';
  const initials = getInitials(profile.full_name, profile.username);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          // Responsive width with relative units
          "w-[calc(100%-2rem)] max-w-[28rem] sm:max-w-[32rem]",
          // Responsive height - uses vh units for zoom safety
          "max-h-[90vh] sm:max-h-[85vh]",
          // Flexbox for internal layout
          "flex flex-col overflow-hidden",
          // Smooth animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%]",
          "duration-200",
          // Rounded corners with relative units
          "rounded-xl sm:rounded-2xl",
          // Padding with relative units
          "p-0"
        )}
        aria-label="Organizer Profile"
      >
        {/* Header with relative padding */}
        <DialogHeader className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-bold">
            Organizer Profile
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-[0.25rem] border-gray-200 border-t-orange-500 dark:border-gray-700 dark:border-t-orange-400" />
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 py-6 space-y-6 sm:space-y-8">
              {/* Avatar and Name Section */}
              <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-orange-200 dark:border-orange-900/30 transition-transform hover:scale-105 duration-200">
                  {profile.avatar_url && (
                    <AvatarImage 
                      src={profile.avatar_url} 
                      alt={displayName}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.error('Avatar image failed to load:', profile.avatar_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-lg sm:text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                    {displayName}
                  </h3>
                  {profile.username && profile.username !== displayName && (
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Profile Fields - Only Email, Phone, Bio */}
              <div className="space-y-3 sm:space-y-4">
                {/* Email */}
                <ProfileField
                  icon={<Mail className="h-4 w-4 sm:h-5 sm:w-5" />}
                  label="Email"
                  value={profile.email}
                  href={profile.email ? `mailto:${profile.email}` : undefined}
                  colorClass={profile.email 
                    ? "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                  }
                  isEmpty={!profile.email}
                />

                {/* Phone */}
                <ProfileField
                  icon={<Phone className="h-4 w-4 sm:h-5 sm:w-5" />}
                  label="Phone"
                  value={profile.phone}
                  href={profile.phone ? `tel:${profile.phone}` : undefined}
                  colorClass={profile.phone
                    ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                  }
                  isEmpty={!profile.phone}
                />

                {/* Bio */}
                <ProfileField
                  icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                  label="Bio"
                  value={profile.bio}
                  colorClass={profile.bio
                    ? "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                  }
                  isEmpty={!profile.bio}
                  multiline
                />
              </div>

              {/* Footer hint */}
              <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                Press ESC to close
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Reusable ProfileField component for consistent styling
interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  colorClass: string;
  isEmpty?: boolean;
  multiline?: boolean;
}

function ProfileField({ 
  icon, 
  label, 
  value, 
  href, 
  colorClass, 
  isEmpty = false,
  multiline = false 
}: ProfileFieldProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-800 transition-all duration-200 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-700">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded shrink-0 transition-transform duration-200", colorClass)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[0.625rem] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            {label}
          </label>
          {isEmpty ? (
            <p className="text-sm sm:text-base text-gray-400 dark:text-gray-500 italic">
              Not provided
            </p>
          ) : href ? (
            <a
              href={href}
              className="text-sm sm:text-base text-blue-600 dark:text-blue-400 hover:underline break-all transition-colors duration-150"
            >
              {value}
            </a>
          ) : (
            <p className={cn(
              "text-sm sm:text-base text-gray-900 dark:text-white",
              multiline ? "break-words whitespace-pre-wrap" : "truncate"
            )}>
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}