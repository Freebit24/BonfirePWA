'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { EventCategory } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, Users, Tag, X, MapPin, Image as ImageIcon } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { LocationPickerMap } from '@/components/ui/location-picker-map';
import { logger } from '@/lib/logger';
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

const to12Hour = (value: string) => {
  if (!value) return { display: '', meridiem: 'AM' as 'AM' | 'PM' };
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return { display: '', meridiem: 'AM' as 'AM' | 'PM' };
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { display: `${pad(hour12)}:${pad(m)}`, meridiem };
};

const to24Hour = (display: string, meridiem: 'AM' | 'PM') => {
  const match = display.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match) return '';
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 1 || hour > 12 || minute > 59) return '';
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour)}:${pad(minute)}`;
};

export default function EditEventForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const { fetchEventById, fetchEvents, selectedEvent, updateEvent, inviteUserByEmail, fetchInvites, deleteInvite, deleteEvent } = useEventStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Use local-time ISO date (not UTC) to avoid off-by-one day shifts
  const getLocalISODate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  };

  const todayStr = getLocalISODate(new Date());
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  const maxDateStr = getLocalISODate(maxDate);

  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);
  const [{ start, end }, setTimeDisplay] = useState({ start: to12Hour(''), end: to12Hour('') });
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    image_url: '',
    location: '',
    latitude: 26.8060,
    longitude: 75.8022,
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    time_zone: 'Asia/Kolkata',
    category: '' as EventCategory,
    max_attendees: '',
    tags: '',
  });

  useEffect(() => {
    if (eventId) {
      logger.log('Edit page: loading event', eventId);
      fetchEventById(eventId);
      loadInvites();
    }
  }, [eventId, fetchEventById]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInvites = async () => {
    if (!eventId) return;
    setLoadingInvites(true);
    try {
      const data = await fetchInvites(eventId);
      setInvites(data);
    } catch (err) {
      console.error('Failed to load invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      const ev = selectedEvent as any;
      // compute end date/time from duration
      const start = new Date(`${ev.date}T${ev.time}`);
      const end = new Date(start.getTime() + (ev.duration || 0) * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');

      const loadedData = {
        title: ev.title || '',
        description: ev.description || '',
        image_url: ev.image_url || '',
        location: ev.location || '',
        latitude: ev.latitude ?? 26.8060,
        longitude: ev.longitude ?? 75.8022,
        date: ev.date || '',
        time: ev.time || '',
        end_date: end.toISOString().split('T')[0],
        end_time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        time_zone: ev.time_zone || 'Asia/Kolkata',
        category: ev.category || '',
        max_attendees: ev.max_attendees ? String(ev.max_attendees) : '',
        tags: (ev.tags || []).join(', '),
      };

      setFormData(loadedData);
      setInitialFormData(loadedData);
    }
  }, [selectedEvent]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept all router navigation
  useEffect(() => {
    const routerPush = router.push.bind(router);
    const routerReplace = router.replace.bind(router);
    
    router.push = (url: any) => {
      if (hasUnsavedChanges) {
        setShowExitDialog(true);
        (window as any).__pendingNavigation = url;
      } else {
        routerPush(url);
      }
    };
    
    router.replace = (url: any) => {
      if (hasUnsavedChanges) {
        setShowExitDialog(true);
        (window as any).__pendingNavigation = url;
      } else {
        routerReplace(url);
      }
    };
    
    return () => {
      router.push = routerPush;
      router.replace = routerReplace;
    };
  }, [router, hasUnsavedChanges, showExitDialog]);

  // Intercept browser back button
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Push a state so we can intercept the back button
    window.history.pushState({ unsavedChanges: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        // Show confirmation dialog
        setShowExitDialog(true);
        // Push state again to stay on current page
        window.history.pushState({ unsavedChanges: true }, '');
        (window as any).__pendingNavigation = null;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setTimeDisplay({ start: to12Hour(formData.time), end: to12Hour(formData.end_time) });
  }, [formData.time, formData.end_time]);

  useEffect(() => {
    if (formData.image_url) {
      setImagePreview(formData.image_url);
    } else {
      setImagePreview(null);
    }
  }, [formData.image_url]);

  if (authLoading) return null;
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => {
      const updated = { ...prev, [field]: value };
      // Check if form has been modified from initial state
      if (initialFormData && JSON.stringify(updated) !== JSON.stringify(initialFormData)) {
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
      return updated;
    });
  };

  const handleTimeInput = (field: 'time' | 'end_time', display: string, meridiem: 'AM' | 'PM') => {
    const value24 = to24Hour(display, meridiem);
    setTimeDisplay(prev => ({
      ...prev,
      [field === 'time' ? 'start' : 'end']: { display, meridiem },
    }));
    setFormData((prev: any) => ({ ...prev, [field]: value24 }));
    setHasUnsavedChanges(true);
  };

  // Image helpers
  const isLikelyImageUrl = (url: string) => /^(https?:)?\/\//i.test(url) && /\.(png|jpg|jpeg|gif|webp|avif|svg)(\?.*)?$/i.test(url);
  const setImageFromUrl = (url: string) => {
    handleChange('image_url', url);
    setImagePreview(url);
  };
  const onImageDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const dt = e.dataTransfer;
    if (!dt) return;
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (uri && isLikelyImageUrl(uri.trim())) {
      setImageFromUrl(uri.trim());
      return;
    }
    if (dt.files && dt.files.length > 0) {
      const file = Array.from(dt.files).find((f) => f.type.startsWith('image/'));
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);
        handleChange('image_url', objectUrl);
      }
    }
  };
  const onImageDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Generate 12-hour time options at 30-minute intervals
  const halfHourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = Math.floor(i / 2) + 1; // 1..12
    const minute = i % 2 === 0 ? '00' : '30';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hour)}:${minute}`;
  });

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.back();
    }
  };

  const confirmExit = () => {
    // Remove beforeunload listener by directly setting hasUnsavedChanges to false
    // This will trigger the useEffect to unregister the handler
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    
    // Small delay to allow state to update before navigation
    setTimeout(() => {
      // Check if there's a pending navigation from router.push/router.replace
      const pendingNav = (window as any).__pendingNavigation;
      if (pendingNav) {
        (window as any).__pendingNavigation = null;
        // Directly navigate without triggering the interceptor again
        if (typeof pendingNav === 'string') {
          window.location.href = pendingNav;
        } else {
          router.push(pendingNav);
        }
      } else {
        // Back button was pressed, go back in history
        window.history.back();
      }
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredFields = [
      formData.title,
      formData.description,
      formData.category,
      formData.location,
      formData.date,
      formData.time,
      formData.end_date,
      formData.end_time,
    ];

    if (requiredFields.some((field: any) => !field || String(field).trim() === '')) {
      toast.warning('Please fill all required fields marked with *');
      return;
    }

    if (new Date(formData.date) > maxDate || new Date(formData.end_date) > maxDate) {
      toast.warning('Event dates must be within 1 year from today');
      return;
    }

    setConfirmOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      await deleteEvent(selectedEvent.id);
      toast.success('Event deleted');
      setHasUnsavedChanges(false);
      setDeleteConfirmOpen(false);
      // Refresh events list and navigate away
      try {
        await fetchEvents?.();
      } catch (err) {
        logger.warn('Failed to refresh events after delete', err);
      }
      router.replace('/organizer');
      try { router.refresh(); } catch {}
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Failed to delete event');
      setDeleteConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const performUpdate = async () => {
    if (!selectedEvent) {
      console.error('No selectedEvent to update');
      return;
    }
    logger.log('performUpdate called with eventId:', selectedEvent.id);
    setLoading(true);
    setConfirmOpen(false);

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(`${formData.end_date}T${formData.end_time}`);
      const durationMinutes = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      if (durationMinutes <= 0) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }

      // Validate max_attendees if provided
      if (formData.max_attendees && parseInt(formData.max_attendees) <= 0) {
        toast.error('Max attendees must be greater than 0');
        setLoading(false);
        return;
      }

      const tagsArray = formData.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      logger.log('Calling updateEvent with data...');
      const updated = await updateEvent(selectedEvent.id, {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url || undefined,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        date: formData.date,
        time: formData.time,
        end_date: formData.end_date,
        end_time: formData.end_time,
        time_zone: formData.time_zone,
        duration: durationMinutes,
        category: formData.category,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
        tags: tagsArray,
      });

      logger.log('Update completed, showing success toast');
      toast.success('Event updated successfully');

      // Refresh the master events list and the single event to ensure all views pick up changes
      try {
        if (fetchEvents) {
          await fetchEvents();
          logger.log('Fetched events list after update');
        }

        // re-fetch the single event (some pages read selectedEvent or fetch on mount)
        if (fetchEventById && updated?.id) {
          await fetchEventById(updated.id);
          logger.log('Re-fetched updated event:', updated.id);
        }
      } catch (err) {
        logger.warn('Error refreshing events after update', err);
      }

      // Replace the route and refresh the app router to force server components to re-evaluate
      logger.log('Navigating to event page and refreshing route...');
      setHasUnsavedChanges(false); // Clear unsaved changes flag after successful save
      setConfirmOpen(false); // Close the confirmation dialog
      
      setTimeout(() => {
        router.replace(`/event/${selectedEvent.id}`);
        // router.replace is synchronous; call refresh to make sure server data is reloaded
        try {
          router.refresh();
        } catch (e) {
          // older Next versions or environments might not support router.refresh()
          console.debug('router.refresh not available:', e);
        }
      }, 0);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update event');
      setLoading(false);
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
      await loadInvites(); // Refresh invite list
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
      await loadInvites(); // Refresh list
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove invite');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-300">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-10">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-white">Edit Event</h1>
        </div>

        <Card className="bg-zinc-900/40 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-200">Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Title <span className="text-orange-500">*</span></label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value.slice(0,100))}
                    placeholder="Enter your title"
                    maxLength={100}
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-xs text-zinc-500">{formData.title.length}/100 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Description <span className="text-orange-500">*</span></label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value.slice(0,2000))}
                    placeholder="Describe your event..."
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-300 resize-none focus-visible:ring-1 focus-visible:ring-orange-500 focus-visible:ring-offset-0"
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-zinc-500">{formData.description.length}/2000 characters</p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Category *</label>
                  <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900/95 border-zinc-800">
                      {EVENT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value} className="text-zinc-300">
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cover Image</label>
                  <div
                    className="border-2 border-dashed border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-zinc-600 hover:bg-zinc-900/30 transition-all cursor-pointer group"
                    onDragOver={onImageDragOver}
                    onDrop={onImageDrop}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-3 group-hover:bg-zinc-700">
                      <ImageIcon className="text-zinc-400 group-hover:text-zinc-200" size={20} />
                    </div>
                    <p className="text-sm text-zinc-400 mb-2">Drag & drop an image file or URL, or paste an image URL below</p>
                    <p className="text-xs text-zinc-500 mb-3">💡 Tip: WebP or JPG images (under 1MB) load faster. Recommended aspect ratio: 16:9</p>
                    {imagePreview && (
                      <div className="w-full max-w-md mb-3 rounded-lg overflow-hidden border border-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" width="384" height="192" />
                      </div>
                    )}
                    <Input
                      id="image_url"
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => handleChange('image_url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                    {formData.image_url || imagePreview ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 text-zinc-400 hover:text-white"
                        onClick={() => {
                          handleChange('image_url', '');
                          setImagePreview(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" /> Clear Image
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                <h2 className="text-sm font-bold text-zinc-400">Date, Location & Settings</h2>

                {/* Dates & Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">Start Date</label>
                    <div className="relative group">
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        min={todayStr}
                        max={maxDateStr}
                        required
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-600"
                      />
                      <Calendar className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">Start Time</label>
                    <div className="flex gap-2">
                      <Select value={start.display} onValueChange={(value) => handleTimeInput('time', value, start.meridiem as 'AM' | 'PM')}>
                        <SelectTrigger className="flex-1 bg-zinc-900/50 border-zinc-800 text-zinc-300">
                          <SelectValue placeholder="hh:mm" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900/95 border-zinc-800">
                          {halfHourOptions.map((t) => (
                            <SelectItem key={`start-${t}`} value={t} className="text-zinc-300">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={start.meridiem} onValueChange={(value: 'AM' | 'PM') => handleTimeInput('time', start.display, value)}>
                        <SelectTrigger className="w-24 bg-zinc-900/50 border-zinc-800 text-zinc-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900/95 border-zinc-800">
                          <SelectItem value="AM" className="text-zinc-300">AM</SelectItem>
                          <SelectItem value="PM" className="text-zinc-300">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">End Date</label>
                    <div className="relative group">
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        min={formData.date || todayStr}
                        max={maxDateStr}
                        required
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-600"
                      />
                      <Calendar className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">End Time</label>
                    <div className="flex gap-2">
                      <Select value={end.display} onValueChange={(value) => handleTimeInput('end_time', value, end.meridiem as 'AM' | 'PM')}>
                        <SelectTrigger className="flex-1 bg-zinc-900/50 border-zinc-800 text-zinc-300">
                          <SelectValue placeholder="hh:mm" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900/95 border-zinc-800">
                          {halfHourOptions.map((t) => (
                            <SelectItem key={`end-${t}`} value={t} className="text-zinc-300">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={end.meridiem} onValueChange={(value: 'AM' | 'PM') => handleTimeInput('end_time', end.display, value)}>
                        <SelectTrigger className="w-24 bg-zinc-900/50 border-zinc-800 text-zinc-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900/95 border-zinc-800">
                          <SelectItem value="AM" className="text-zinc-300">AM</SelectItem>
                          <SelectItem value="PM" className="text-zinc-300">PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Time Zone */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Time Zone</label>
                  <Select value={formData.time_zone} onValueChange={(value) => handleChange('time_zone', value)}>
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Select Time Zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900/95 border-zinc-800 max-h-72">
                      <SelectItem value="Asia/Kolkata" className="text-zinc-300">IST (Asia/Kolkata)</SelectItem>
                      <SelectItem value="UTC" className="text-zinc-300">UTC</SelectItem>
                      <SelectItem value="America/New_York" className="text-zinc-300">ET (New York)</SelectItem>
                      <SelectItem value="America/Los_Angeles" className="text-zinc-300">PT (Los Angeles)</SelectItem>
                      <SelectItem value="Europe/London" className="text-zinc-300">UK (London)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Location</label>
                  <div className="relative group">
                    <LocationAutocomplete
                      value={formData.location}
                      onChange={(location) => handleChange('location', location)}
                      onLocationSelect={(locationData) => setFormData((prev: any) => ({ ...prev, location: locationData.address, latitude: locationData.latitude, longitude: locationData.longitude }))}
                      placeholder="Search for a location"
                      required
                    />
                    <MapPin className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={16} />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-zinc-800">
                    <LocationPickerMap
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onChange={({ latitude, longitude, address }) => {
                        setFormData((prev: any) => ({
                          ...prev,
                          latitude,
                          longitude,
                          location: address || prev.location,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>

                {/* Max Attendees */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Max Attendees</label>
                  <Input
                    id="max_attendees"
                    type="number"
                    placeholder="No limit"
                    value={formData.max_attendees}
                    onChange={(e) => handleChange('max_attendees', e.target.value)}
                    min="1"
                    step="1"
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-600"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Tags</label>
                  <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 min-h-[44px] flex flex-wrap gap-2">
                    {(formData.tags || '')
                      .split(',')
                      .map((t: string) => t.trim())
                      .filter((t: string) => t.length > 0)
                      .map((tag: string) => (
                        <div key={tag} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-zinc-700">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const next = (formData.tags || '')
                                .split(',')
                                .map((t: string) => t.trim())
                                .filter((t: string) => t.length > 0 && t !== tag)
                                .join(', ');
                              handleChange('tags', next);
                            }}
                            className="hover:text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => handleChange('tags', e.target.value)}
                      placeholder="networking, tech, startup"
                      className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs placeholder-zinc-500 flex-1 min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-zinc-400 hover:text-white"
                    onClick={handleBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={loading}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="ml-auto"
                    disabled={loading}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Delete Event
                  </Button>
                </div>
              </div>
            </form>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Save changes?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to save the changes to this event? This will update the event details.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => performUpdate()}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove the event and any related invites.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmOpen(false)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteEvent}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? All your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitDialog(false)}>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
