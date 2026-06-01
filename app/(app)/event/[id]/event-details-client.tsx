'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { db } from '@/utils/supabase';
import { Profile } from '@/types';
import OrganizerProfileModal from '@/components/organizer/organizer-profile-modal';
import { formatDate, formatDateWithYear, formatTime, getEventStatus } from '@/utils/helpers';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { submitJoinRequest, organizerJoinEvent } from '@/app/actions/private-events';
import {
  MapPin,
  Clock,
  Calendar,
  Users,
  Share2,
  Navigation,
  QrCode,
  Edit,
  CalendarClock,
  Lock,
  UserPlus,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import PrivateEventControls from '@/components/organizer/private-event-controls';
import { Input } from '@/components/ui/input';
import { MailPlus, X } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function EventDetailsClient({
  eventId,
}: {
  eventId: string;
}) {
  logger.log('EVENT ID RECEIVED:', eventId);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
logger.log('EVENT ID RECEIVED:', eventId);

  const {
    selectedEvent,
    fetchEventById,
    joinEvent,
    leaveEvent,
    hasJoinedEvent,
  } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [isJoined, setIsJoined] = useState(false);
  const [attendeeStatus, setAttendeeStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null);
  const [organizerName, setOrganizerName] = useState<string>('');
  const [organizerProfile, setOrganizerProfile] = useState<Profile | null>(null);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [loadingOrganizerProfile, setLoadingOrganizerProfile] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [joining, setJoining] = useState(false);
  const [linkJoinProcessed, setLinkJoinProcessed] = useState(false);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [showAttendeesDialog, setShowAttendeesDialog] = useState(false);
  const [attendees, setAttendees] = useState<Array<{ id: string; email: string; full_name?: string }>>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

const joinIntent = searchParams?.get('join');
const shouldAutoJoin =
  joinIntent === '1' || joinIntent?.toLowerCase() === 'true';

  useEffect(() => {
    logger.log('EVENT ID RECEIVED:', eventId);
  if (!eventId) return;

    const fetchAndCheckJoinStatus = async () => {
      logger.log('Event details page: fetching event', eventId);
      if (!eventId) return;

      const event = await fetchEventById(eventId);
      logger.log('Event details page: fetched event', event);

      try {
        router.refresh();
      } catch (e) {
        console.debug('router.refresh not available or failed', e);
      }

      if (event) {
        // Load invites for organizer view
        if (user && event.organizer_id === user.id) {
          await loadInvites(event.id);
        }
        // Join status (only if user logged in)
        if (user) {
          const joined = await hasJoinedEvent(event.id, user.id);

          // Check attendee status for private events
          if (event.is_private) {
            const { data: attendeeData } = await db
              .from('event_attendees')
              .select('status')
              .eq('event_id', event.id)
              .eq('user_id', user.id)
              .maybeSingle();  // Use maybeSingle to avoid error when no record exists
            
            if (attendeeData) {
              setAttendeeStatus(attendeeData.status as 'approved' | 'pending' | 'rejected');
            } else {
              setAttendeeStatus(null);  // User hasn't requested to join yet
            }
          } else {
            // For public events, reflect joined state simply
            setAttendeeStatus(joined ? 'approved' : null);
          }
          setIsJoined(joined);
        }

        // Organizer: show full_name instead of email, fetch full profile
        if (event.organizer_id) {
          try {
            const { data: profile } = await db
              .from('profiles')
              .select('id, email, username, full_name, avatar_url, bio, phone')
              .eq('id', event.organizer_id)
              .maybeSingle();

            if (profile) {
              // Store full profile for modal
              setOrganizerProfile(profile);
              
              // Display full_name if available, fallback to username, then email
              const displayName = profile.full_name?.trim() 
                || profile.username?.trim() 
                || profile.email?.trim();

              if (displayName) {
                setOrganizerName(displayName);
              } else if (event.organizer_id === user?.id) {
                setOrganizerName(user?.email || 'You');
              } else {
                setOrganizerName('Organizer');
              }
            } else if (event.organizer_id === user?.id) {
              setOrganizerName(user?.email || 'You');
            } else {
              setOrganizerName('Organizer');
            }
          } catch (err) {
            logger.warn('Failed to load organizer profile', err);
            setOrganizerName(event.organizer_id === user?.id
              ? (user?.email || 'You')
              : 'Organizer');
          }
        }
      }

      setLoading(false);
    };

    fetchAndCheckJoinStatus();
  }, [eventId, user, fetchEventById]); // eslint-disable-line react-hooks/exhaustive-deps

  const { inviteUserByEmail, fetchInvites, deleteInvite } = useEventStore();

  const loadInvites = async (id: string) => {
    setLoadingInvites(true);
    try {
      const data = await fetchInvites(id);
      setInvites(data);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleSendInvites = async () => {
    if (!selectedEvent) {
      toast.error('Load the event before sending invites');
      return;
    }

    const emails = inviteEmails
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.warning('Enter at least one email');
      return;
    }

    setInviting(true);
    const successes: string[] = [];
    const failures: string[] = [];

    for (const email of emails) {
      try {
        await inviteUserByEmail(selectedEvent.id, email);
        successes.push(email);
      } catch (err: any) {
        failures.push(`${email}: ${err?.message || 'failed'}`);
      }
    }

    if (successes.length) {
      toast.success(`Invited: ${successes.join(', ')}`);
      setInviteEmails('');
      await loadInvites(selectedEvent.id);
    }
    if (failures.length) {
      toast.error(`Failed: ${failures.join('; ')}`);
    }

    setInviting(false);
  };

  const handleDeleteInvite = async (inviteId: string, email: string) => {
    if (!window.confirm(`Remove invite for ${email}?`)) return;
    try {
      await deleteInvite(inviteId);
      toast.success(`Removed invite for ${email}`);
      if (selectedEvent) await loadInvites(selectedEvent.id);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove invite');
    }
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent) return;

    if (!user) {
      toast.info('Please sign in to join this event');
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    try {
      if (isJoined || attendeeStatus === 'approved') {
        setShowLeaveDialog(true);
      } else {
        // Check if event has reached max capacity before attempting to join
        if (selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees) {
          toast.error('This event has reached maximum capacity');
          return;
        }

        setJoining(true);

        // CRITICAL: Use different logic for private events that require approval
        if (selectedEvent.is_private && selectedEvent.require_approval) {
          // Organizers bypass approval and are auto-approved
          if (user.id === selectedEvent.organizer_id) {
            const result = await organizerJoinEvent(selectedEvent.id, user.id);
            if (result.success) {
              setIsJoined(true);
              setAttendeeStatus('approved');
              toast.success('Successfully joined the event!');
              // Refetch event to sync UI with database state
              await fetchEventById(selectedEvent.id);
            } else {
              toast.error(result.error || 'Failed to join event');
            }
          } else {
            const result = await submitJoinRequest(selectedEvent.id, user.id);
            if (result.success) {
              setAttendeeStatus('pending');
              toast.success('Join request submitted! Waiting for organizer approval.');
              // Refresh event to sync pending count display
              await fetchEventById(selectedEvent.id);
            } else {
              toast.error(result.error || 'Failed to submit join request');
            }
          }
        } else {
          // Public events or private events without approval can join directly
          const success = await joinEvent(selectedEvent.id, user.id);
          if (success) {
            setIsJoined(true);
            setAttendeeStatus('approved');
            toast.success('Successfully joined the event!');
            // Refetch event to sync UI with database state
            await fetchEventById(selectedEvent.id);
          } else {
            // Check if failure was due to capacity (in case of race condition)
            if (selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees) {
              toast.error('This event has reached maximum capacity');
            } else {
              toast.error('Failed to join event');
            }
          }
        }
      }
    } catch (error) {
      toast.error('Failed to update event status');
    } finally {
      setJoining(false);
    }
  };

  const confirmLeave = async () => {
    if (!user || !selectedEvent) return;
    
    try {
      await leaveEvent(selectedEvent.id, user.id);
      setIsJoined(false);
      setAttendeeStatus(null);
      setShowLeaveDialog(false);
      toast.success('You have left the event');
      // Refetch event to sync UI with database state
      await fetchEventById(selectedEvent.id);
    } catch (error) {
      toast.error('Failed to leave event');
    }
  };

  const handleOpenOrganizerProfile = async () => {
    if (!selectedEvent?.organizer_id) return;

    // If we already have the full profile loaded, just open modal
    if (organizerProfile) {
      setShowOrganizerModal(true);
      return;
    }

    // Otherwise, fetch it
    setLoadingOrganizerProfile(true);
    try {
      const { data: profile } = await db
        .from('profiles')
        .select('id, email, username, full_name, avatar_url, bio, phone')
        .eq('id', selectedEvent.organizer_id)
        .maybeSingle();

      if (profile) {
        setOrganizerProfile(profile);
        setShowOrganizerModal(true);
      } else {
        toast.error('Could not load organizer profile');
      }
    } catch (err) {
      console.error('Failed to fetch organizer profile:', err);
      toast.error('Failed to load organizer profile');
    } finally {
      setLoadingOrganizerProfile(false);
    }
  };

  const handleShare = async () => {
    if (!selectedEvent) return;

    const joinLink = (() => {
      const url = new URL(window.location.href);
      url.searchParams.set('join', '1');
      return url.toString();
    })();

    try {
      await navigator.share({
        title: selectedEvent.title,
        text: selectedEvent.description,
        url: joinLink,
      });
    } catch (error) {
      await navigator.clipboard.writeText(joinLink);
      toast.success('Join link copied to clipboard!');
    }
  };

  const handleCopyJoinLink = async () => {
    if (!selectedEvent) return;

    const url = new URL(window.location.href);
    url.searchParams.set('join', '1');

    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success('Join link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy join link');
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

 useEffect(() => {
  if (!shouldAutoJoin || linkJoinProcessed || !selectedEvent) return;

  if (!user) {
    setLinkJoinProcessed(true);
    toast.info('Please sign in to join this event');
    const currentPath = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    return;
  }

  if (isJoined) {
    setLinkJoinProcessed(true);
    return;
  }

  setShowJoinConfirm(true);
}, [shouldAutoJoin, linkJoinProcessed, selectedEvent, user, isJoined, router]);

  const handleJoinConfirm = async () => {
    if (!selectedEvent) return;

    if (!user) {
      toast.info('Please sign in to join this event');
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Check if event has reached max capacity
    if (selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees) {
      toast.error('This event has reached maximum capacity');
      setShowJoinConfirm(false);
      setLinkJoinProcessed(true);
      return;
    }

    try {
      setJoining(true);
      // Respect privacy + approval requirements on link-based join as well
      if (selectedEvent.is_private && selectedEvent.require_approval) {
        // Organizer joins directly
        if (user.id === selectedEvent.organizer_id) {
          const result = await organizerJoinEvent(selectedEvent.id, user.id);
          if (result.success) {
            setIsJoined(true);
            setAttendeeStatus('approved');
            toast.success('You joined this event');
          } else {
            toast.error(result.error || 'Unable to join this event');
          }
        } else {
          // Non-organizer must submit a join request
          const result = await submitJoinRequest(selectedEvent.id, user.id);
          if (result.success) {
            setAttendeeStatus('pending');
            toast.success('Join request submitted! Waiting for organizer approval.');
            // Refresh event to sync state
            await fetchEventById(selectedEvent.id);
          } else {
            toast.error(result.error || 'Unable to request to join this event');
          }
        }
      } else {
        // Public or private without approval → direct join
        const success = await joinEvent(selectedEvent.id, user.id);
        if (success) {
          setIsJoined(true);
          setAttendeeStatus('approved');
          toast.success('You joined this event');
        } else {
          // Check if failure was due to capacity (in case of race condition)
          if (selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees) {
            toast.error('This event has reached maximum capacity');
          } else {
            toast.error('Unable to join this event');
          }
        }
      }
    } catch (error) {
      toast.error('Unable to join this event');
    } finally {
      setJoining(false);
      setShowJoinConfirm(false);
      setLinkJoinProcessed(true);
    }
  };

  const handleJoinDecline = () => {
    setShowJoinConfirm(false);
    setLinkJoinProcessed(true);
    router.push('/home');
  };

  const handleViewAttendees = async () => {
    if (!selectedEvent) return;

    setShowAttendeesDialog(true);
    setLoadingAttendees(true);

    try {
      // Fetch APPROVED attendee IDs only (not pending requests)
      const { data: attendeeData, error: attendeeError } = await db
        .from('event_attendees')
        .select('user_id')
        .eq('event_id', selectedEvent.id)
        .eq('status', 'approved');  // Only show approved attendees

      if (attendeeError) throw attendeeError;

      if (!attendeeData || attendeeData.length === 0) {
        setAttendees([]);
        setLoadingAttendees(false);
        return;
      }

      const attendeeIds = attendeeData.map(a => a.user_id);

      // Fetch profile information for all attendees
      const { data: profiles, error: profilesError } = await db
        .from('profiles')
        .select('id, email, full_name')
        .in('id', attendeeIds);

      if (profilesError) throw profilesError;

      setAttendees(profiles || []);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      toast.error('Failed to load attendees');
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  };

  // Keep the shared-layout container mounted while data loads so transitions can complete
  if (loading) {
    return (
      <div className="min-h-screen bg-transparent relative">
        <Header />
        <main className="pb-20 md:pb-6">
          <div className="block">
            <div className="relative h-64 md:h-80 overflow-hidden bg-muted/20 animate-pulse">
              <div className="w-full h-full bg-muted/30" />
              <div className="absolute inset-0 bg-black/10" />
              <div className="absolute bottom-6 left-6 right-6 space-y-3">
                <div className="h-8 w-2/3 bg-white/60 dark:bg-black/30 rounded" />
                <div className="h-4 w-1/3 bg-white/60 dark:bg-black/30 rounded" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-950 rounded-t-3xl -mt-6 relative z-10 p-6 space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-28 bg-muted/20 rounded animate-pulse" />
                <div className="h-10 w-28 bg-muted/20 rounded animate-pulse" />
                <div className="h-10 w-28 bg-muted/20 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-24 bg-muted/10 rounded-lg animate-pulse" />
                <div className="h-24 bg-muted/10 rounded-lg animate-pulse" />
                <div className="h-24 bg-muted/10 rounded-lg animate-pulse" />
                <div className="h-24 bg-muted/10 rounded-lg animate-pulse" />
              </div>
              <div className="h-12 bg-muted/10 rounded-lg animate-pulse" />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The event you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button onClick={() => router.push('/home')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const category = EVENT_CATEGORIES.find(cat => cat.value === selectedEvent.category);
  const status = getEventStatus(selectedEvent);

  const shouldBlurContent = shouldAutoJoin && showJoinConfirm && !isJoined;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0c0a10] text-slate-100">
      {/* Gradient vignette background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent" />
      
      <div className={cn(shouldBlurContent && "pointer-events-none select-none filter blur-sm")}> 
        <Header />

        <main className="pb-20 md:pb-6">
          {/* Hero Image - Premium cinematic design with rounded corners */}
          <div className="container mx-auto px-3 sm:px-4 pt-6">
            <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 shadow-2xl">
              {selectedEvent.image_url ? (
                <>
                  {/* Blurred background */}
                  <Image
                    src={selectedEvent.image_url}
                    alt={selectedEvent.title}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover blur-md scale-110"
                    onError={() => {
                      logger.warn('Hero image failed to load:', selectedEvent.image_url);
                    }}
                  />
                  {/* Semi-transparent overlay */}
                  <div className="absolute inset-0 bg-black/30" />
                  {/* Main image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src={selectedEvent.image_url}
                      alt={selectedEvent.title}
                      fill
                      priority
                      sizes="100vw"
                      className="object-contain"
                      onError={() => {
                        logger.warn('Event image failed to load:', selectedEvent.image_url);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-pink-600">
                  <span className="text-8xl">{category?.icon || '🔥'}</span>
                </div>
              )}

              {/* Dark gradient overlay from bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Top badges with glassmorphism */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge 
                  variant={status === 'Today' ? 'default' : 'secondary'}
                  className="backdrop-blur-xl bg-white/20 border-white/30 text-white shadow-lg"
                >
                  {status}
                </Badge>
                {selectedEvent.is_private && (
                  <Badge 
                    variant="secondary" 
                    className="backdrop-blur-xl bg-purple-500/30 border-purple-300/30 text-white shadow-lg"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>

              {/* Top-right action buttons */}
              <div className="absolute top-4 right-4 flex gap-2">
                {user && selectedEvent.organizer_id === user.id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 w-10 rounded-full p-0 backdrop-blur-xl bg-white/20 border-white/30 hover:bg-white/30 shadow-lg"
                    onClick={() => router.push(`/organizer/edit/${selectedEvent.id}`)}
                  >
                    <Edit className="h-4 w-4 text-white" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-10 w-10 rounded-full p-0 backdrop-blur-xl bg-white/20 border-white/30 hover:bg-white/30 shadow-lg"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
              </div>

              {/* Bottom: Organizer info with avatar */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                {organizerProfile && (
                  <Avatar className="h-10 w-10 border-2 border-white/50 shadow-lg">
                    <AvatarImage src={organizerProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                      {organizerProfile.full_name?.[0]?.toUpperCase() || organizerProfile.email?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  {organizerName && (
                    <button
                      onClick={handleOpenOrganizerProfile}
                      disabled={loadingOrganizerProfile}
                      className="text-left group"
                    >
                      <p className="text-sm text-white/90 group-hover:text-white transition-colors">
                        Hosted by{' '}
                        <span className="font-semibold">{organizerName}</span>
                      </p>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        <div className="container mx-auto px-3 sm:px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left column: content */}
              <div className="lg:col-span-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white break-words whitespace-normal">
                  {selectedEvent.title}
                </h1>

                {/* About This Event - moved right after title */}
                <div className="rounded-2xl p-6 mb-6 border border-white/10 bg-white/10 backdrop-blur-xl">
                  <h2 className="text-xl font-semibold mb-3 text-white">About This Event</h2>
                  <p className="text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Location Section */}
                <div className="rounded-2xl p-6 border border-white/10 bg-white/10 backdrop-blur-xl mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Map on left */}
                    <div className="relative h-56 rounded-xl overflow-hidden border border-white/10">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${selectedEvent.latitude},${selectedEvent.longitude}&zoom=15`}
                        allowFullScreen
                      />
                      <div 
                        className="absolute inset-0 cursor-pointer"
                        onClick={handleGetDirections}
                      />
                    </div>

                    {/* Location info on right */}
                    <div className="flex flex-col justify-between h-56">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {selectedEvent.location}
                        </h3>
                        <p className="text-sm text-slate-400">
                          Secondary Address, {selectedEvent.location}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        onClick={handleGetDirections}
                      >
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Directions
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedEvent.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-white">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="border-white/20 text-slate-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: sticky action card */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl p-5 shadow-xl lg:sticky lg:top-24">
                  <div className="space-y-4">
                    {/* Date & Time Section */}
                    <div className="pb-4 border-b border-white/10">
                      <div className="flex items-start gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-slate-300 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-base font-semibold text-white">
                            {formatDate(selectedEvent.date)} • {formatTime(selectedEvent.time)}
                          </p>
                          {(selectedEvent.end_date || selectedEvent.end_time) && (
                            <p className="text-sm text-slate-300 mt-1">
                              to {selectedEvent.end_date ? formatDate(selectedEvent.end_date) : formatDate(selectedEvent.date)} • {selectedEvent.end_time ? formatTime(selectedEvent.end_time) : 'Not specified'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedEvent.attendees_count > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Attendees</span>
                        <span className="text-sm font-semibold text-white">{selectedEvent.attendees_count}</span>
                      </div>
                    )}

                    {selectedEvent.attendees_count === 0 && user?.id !== selectedEvent.organizer_id && (
                      <div className="text-center py-2">
                        <p className="text-sm text-slate-400">Be the first to join!</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {user?.id === selectedEvent.organizer_id ? (
                        // User IS the organizer → show disabled "You are hosting" button
                        <button
                          type="button"
                          disabled
                          className="w-full bg-slate-800 text-slate-400 border border-slate-700 cursor-default py-2 rounded-md font-medium text-center"
                        >
                          You are hosting
                        </button>
                      ) : (
                        // User is NOT the organizer → show standard Join button
                        <Button
                          className={cn(
                            "w-full transition-all duration-200",
                            isJoined || attendeeStatus === 'approved'
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : attendeeStatus === 'pending'
                              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                              : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                          )}
                          onClick={handleJoinEvent}
                          disabled={
                            joining || 
                            attendeeStatus === 'pending' || 
                            attendeeStatus === 'rejected' ||
                            (!isJoined && !!selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees)
                          }
                        >
                          {joining ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              {selectedEvent.is_private ? 'Requesting...' : 'Joining...'}
                            </>
                          ) : isJoined || attendeeStatus === 'approved' ? (
                            'Joined'
                          ) : attendeeStatus === 'pending' ? (
                            <>
                              <Clock className="h-4 w-4 mr-2" />
                              Request Pending
                            </>
                          ) : attendeeStatus === 'rejected' ? (
                            'Request Rejected'
                          ) : selectedEvent.max_attendees && selectedEvent.attendees_count >= selectedEvent.max_attendees ? (
                            'Event Full'
                          ) : selectedEvent.is_private ? (
                            <>
                              <Lock className="h-4 w-4 mr-2" />
                              Request to Join
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Join Event
                            </>
                          )}
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        className="w-full border-white/20 text-white"
                        onClick={handleViewAttendees}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Attendees
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full border-white/20 text-white"
                        onClick={handleCopyJoinLink}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Copy Join Link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizer Footer */}
            {organizerName && (
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleOpenOrganizerProfile}
                  disabled={loadingOrganizerProfile}
                  className="w-full group text-center transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-3"
                  aria-label={`View profile of ${organizerName}`}
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Organized by{' '}
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {organizerName}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                    Click to view profile
                  </p>
                </button>
              </div>
            )}

            {selectedEvent.is_private && user?.id === selectedEvent.organizer_id && (
              <div className="mt-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private Event Management
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Manage pending join requests, invite links, and direct invites.
                  </p>
                  <PrivateEventControls eventId={selectedEvent.id} organizerId={selectedEvent.organizer_id} />

                  {/* Invite people
                  <div className="mt-6">
                    <h4 className="font-medium flex items-center gap-2">
                      <MailPlus className="h-4 w-4" />
                      Invite People
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Add emails of registered Bonfire users to send them an invite to this event.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="friend1@example.com, friend2@example.com"
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={handleSendInvites} disabled={inviting}>
                        {inviting ? 'Sending...' : 'Send Invites'}
                      </Button>
                    </div>

                    {loadingInvites ? (
                      <div className="text-center py-4 text-sm text-gray-500">Loading invites...</div>
                    ) : invites.length > 0 ? (
                      <div className="space-y-2 mt-4">
                        <h5 className="text-sm font-medium">Invited Users ({invites.length})</h5>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {invites.map((invite: any) => (
                            <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">{invite.user?.name || invite.email || 'Unknown'}</p>
                                {invite.user?.name && (
                                  <p className="text-xs text-gray-500">{invite.email}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    invite.status === 'accepted'
                                      ? 'default'
                                      : invite.status === 'declined'
                                      ? 'destructive'
                                      : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {invite.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteInvite(invite.id, invite.email || invite.user?.email)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No invites sent yet</p>
                    )}
                  </div> */}
                </div>
              </div>
            )}
          </motion.div>
        </div>
        </main>

        <BottomNav />
      </div>

      <AlertDialog
        open={showJoinConfirm}
        onOpenChange={(open) => {
          if (!shouldAutoJoin) setShowJoinConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join this event?</AlertDialogTitle>
            <AlertDialogDescription>
              You were invited via a join link. Join to view and attend this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleJoinDecline}>
              No, thanks
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleJoinConfirm} disabled={joining}>
              {joining ? 'Joining...' : 'Yes, join event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Attendees Dialog */}
      <Dialog open={showAttendeesDialog} onOpenChange={setShowAttendeesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event Attendees</DialogTitle>
            <DialogDescription>
              {selectedEvent?.attendees_count || 0} people are attending this event
            </DialogDescription>
          </DialogHeader>
          
          {loadingAttendees ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : attendees.length > 0 ? (
            <ScrollArea className="max-h-96 pr-4">
              <div className="space-y-3">
                {attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-500 text-white">
                        {attendee.full_name?.[0]?.toUpperCase() || attendee.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {attendee.full_name || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {attendee.email}
                      </p>
                    </div>
                    {attendee.id === selectedEvent?.organizer_id && (
                      <Badge variant="secondary" className="text-xs">
                        Organizer
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">No attendees yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Organizer Profile Modal */}
      <OrganizerProfileModal
        isOpen={showOrganizerModal}
        onClose={() => setShowOrganizerModal(false)}
        profile={organizerProfile}
        isLoading={loadingOrganizerProfile}
      />
    </div>
  );
}