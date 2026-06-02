'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/common/header';
import { BottomNav } from '@/components/common/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/authStore';
import { useEventStore } from '@/store/eventStore';
import { EVENT_CATEGORIES } from '@/utils/constants';
import { EventCategory } from '@/types';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Lock, X, Image as ImageIcon, ChevronDown, Sparkles } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import { LocationPickerMap } from '@/components/ui/location-picker-map';
import { AiEventGenerator, AiGeneratedData } from '@/components/organizer/ai-event-generator';
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

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore(); // ✅ updated
  const { createEvent } = useEventStore();
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [{ start, end }, setTimeDisplay] = useState({
    start: to12Hour(''),
    end: to12Hour(''),
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    location: '',
    latitude: 26.8060,
    longitude: 75.8022,
    date: todayStr,
    time: '',
    end_date: todayStr,
    end_time: '',
    time_zone: 'Asia/Kolkata',
    category: '' as EventCategory,
    max_attendees: '',
    tags: '',
    visibility: 'public' as 'public' | 'private',
    is_private: false,
    require_approval: false,
  });

  useEffect(() => {
    setTimeDisplay({ start: to12Hour(formData.time), end: to12Hour(formData.end_time) });
  }, [formData.time, formData.end_time]);

  // Get user's location on mount to show on map preview
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        (error) => {
          console.debug('Geolocation not available or denied:', error);
          // Keep default coordinates (Jaipur)
        },
        { timeout: 5000, enableHighAccuracy: false }
      );
    }
  }, []);

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
  }, [hasUnsavedChanges, router]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (hasUnsavedChanges) {
        setShowExitDialog(true);
        window.history.pushState({ unsavedChanges: true }, '');
      }
    };

    window.history.pushState({ unsavedChanges: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (formData.image_url) {
      setImagePreview(formData.image_url);
    } else {
      setImagePreview(null);
    }
  }, [formData.image_url]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requiredFields = [
        formData.title,
        formData.description,
        formData.category,
        formData.location,
        formData.date,
        formData.time,
        formData.end_date,
        formData.end_time,
        formData.visibility,
      ];

      if (requiredFields.some((field) => !field || String(field).trim() === '')) {
        toast.warning('Please fill all required fields marked with *');
        setLoading(false);
        return;
      }

      if (new Date(formData.date) > maxDate || new Date(formData.end_date) > maxDate) {
        toast.warning('Event dates must be within 1 year from today');
        setLoading(false);
        return;
      }

      // Calculate duration in minutes
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
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await createEvent({
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
        organizer_id: user.id,
        visibility: formData.visibility,
        is_private: formData.is_private,
        require_approval: formData.is_private ? formData.require_approval : false,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
        attendees_count: 0,
        tags: tagsArray,
        status: 'active',
      });

      toast.success('Event created successfully!');
      // Clear unsaved changes flag before navigation
      setHasUnsavedChanges(false);
      // Use setTimeout to allow state update to propagate
      setTimeout(() => {
        router.push('/organizer');
      }, 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Check if any meaningful change was made (not just default dates)
    if (field !== 'date' && field !== 'end_date') {
      setHasUnsavedChanges(true);
    } else if (field === 'date' && value !== todayStr) {
      setHasUnsavedChanges(true);
    } else if (field === 'end_date' && value !== todayStr) {
      setHasUnsavedChanges(true);
    }
  };

  const forwardGeocode = (geocoder: any, address: string): Promise<any | null> => {
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any, status: string) => {
        if (status === 'OK' && results?.[0]) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
  };

  const reverseGeocode = (geocoder: any, lat: number, lng: number): Promise<string | null> => {
    return new Promise((resolve) => {
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
        if (status === 'OK' && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address);
        } else {
          resolve(null);
        }
      });
    });
  };

  const getBrowserCoords = (): Promise<GeolocationPosition['coords']> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  };

  const handleAiGenerate = async (aiData: AiGeneratedData) => {
    // Merge AI-generated data into form, user can review and edit
    const updates: Partial<typeof formData> = {
      ...(aiData.title && { title: aiData.title }),
      ...(aiData.description && { description: aiData.description }),
      ...(aiData.category && { category: aiData.category as EventCategory }),
      ...(aiData.date && { date: aiData.date }),
      ...(aiData.time && { time: aiData.time }),
      ...(aiData.end_date && { end_date: aiData.end_date }),
      ...(aiData.end_time && { end_time: aiData.end_time }),
      ...(aiData.tags && { tags: aiData.tags.join(', ') }),
      ...(aiData.max_attendees !== undefined && { max_attendees: String(aiData.max_attendees || '') }),
      ...(aiData.is_private !== undefined && { is_private: aiData.is_private }),
      ...(aiData.require_approval !== undefined && { require_approval: aiData.require_approval }),
    };

    // If location is provided, geocode it to get coordinates
    if (aiData.location) {
      const locationText = aiData.location.trim();
      const wantsCurrent = /^(my location|current location|my current location|here)$/i.test(locationText);
      const googleMaps = (window as any).google?.maps;
      const geocoder = googleMaps?.Geocoder ? new googleMaps.Geocoder() : null;

      try {
        if (wantsCurrent) {
          if (!navigator.geolocation) {
            if (geocoder) {
              const fallback = await reverseGeocode(geocoder, formData.latitude, formData.longitude);
              if (fallback) updates.location = fallback;
            }
            if (!updates.location) {
              toast.error('Location access is unavailable. Please enable it or enter an address.');
            }
            return;
          }

          const coords = await getBrowserCoords();
          updates.latitude = coords.latitude;
          updates.longitude = coords.longitude;

          if (geocoder) {
            const formatted = await reverseGeocode(geocoder, coords.latitude, coords.longitude);
            updates.location = formatted || 'Current location';
          } else {
            updates.location = 'Current location';
          }
        } else if (geocoder) {
          const result = await forwardGeocode(geocoder, locationText);
          if (result?.geometry?.location) {
            const loc = result.geometry.location;
            updates.location = result.formatted_address || locationText;
            updates.latitude = loc.lat();
            updates.longitude = loc.lng();
          } else {
            updates.location = locationText;
          }
        } else {
          updates.location = locationText;
        }
      } catch (error) {
        console.warn('Geocoding failed:', error);
        if (wantsCurrent) {
          let hasFallback = false;
          if (geocoder) {
            const fallback = await reverseGeocode(geocoder, formData.latitude, formData.longitude);
            if (fallback) {
              updates.location = fallback;
              hasFallback = true;
            }
          }
          if (!updates.location) {
            toast.error('Unable to fetch your current location. Please allow location access or type your address.');
          } else if (!hasFallback) {
            toast.message?.('Using your last known map position. You can drag the pin to adjust.');
          }
        } else {
          updates.location = locationText;
        }
      }
    }

    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleTimeInput = (field: 'time' | 'end_time', display: string, meridiem: 'AM' | 'PM') => {
    const value24 = to24Hour(display, meridiem);
    const next = {
      start: field === 'time' ? { display, meridiem } : start,
      end: field === 'end_time' ? { display, meridiem } : end,
    } as any;
    setTimeDisplay(next);
    setFormData(prev => ({ ...prev, [field]: value24 }));
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
    // Priority 1: URL/text
    const uri = dt.getData('text/uri-list') || dt.getData('text/plain');
    if (uri && isLikelyImageUrl(uri.trim())) {
      setImageFromUrl(uri.trim());
      return;
    }
    // Priority 2: image file
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
    const hour = Math.floor(i / 2) + 1; // 1 to 12
    const minute = i % 2 === 0 ? '00' : '30';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hour)}:${minute}`;
  });

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      router.push('/organizer');
    }
  };

  const confirmExit = () => {
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    
    setTimeout(() => {
      const pendingNav = (window as any).__pendingNavigation;
      if (pendingNav) {
        (window as any).__pendingNavigation = null;
        router.push(pendingNav);
      } else {
        window.history.back();
      }
    }, 0);
  };

  // All timezones with UTC offsets
  const timezones = [
    { value: 'Asia/Kolkata', label: 'IST - India Standard Time (UTC+05:30)', offset: '+05:30' },
    { value: 'America/New_York', label: 'EST - Eastern Standard Time (UTC-05:00)', offset: '-05:00' },
    { value: 'America/Chicago', label: 'CST - Central Standard Time (UTC-06:00)', offset: '-06:00' },
    { value: 'America/Denver', label: 'MST - Mountain Standard Time (UTC-07:00)', offset: '-07:00' },
    { value: 'America/Los_Angeles', label: 'PST - Pacific Standard Time (UTC-08:00)', offset: '-08:00' },
    { value: 'Europe/London', label: 'GMT - Greenwich Mean Time (UTC+00:00)', offset: '+00:00' },
    { value: 'Europe/Paris', label: 'CET - Central European Time (UTC+01:00)', offset: '+01:00' },
    { value: 'Asia/Dubai', label: 'GST - Gulf Standard Time (UTC+04:00)', offset: '+04:00' },
    { value: 'Asia/Tokyo', label: 'JST - Japan Standard Time (UTC+09:00)', offset: '+09:00' },
    { value: 'Australia/Sydney', label: 'AEDT - Australian Eastern Daylight Time (UTC+11:00)', offset: '+11:00' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-300">
      <Header />

      {/* AI Event Generator Dialog */}
      <AiEventGenerator
        isOpen={showAiDialog}
        onOpenChange={setShowAiDialog}
        onGenerate={handleAiGenerate}
      />

      <main className="max-w-7xl mx-auto px-6 py-8 pb-24 md:pb-10">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiDialog(true)}
              className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 text-orange-400"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assist
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-white">Create New Event</h1>
          </div>
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Title <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value.slice(0, 100))}
                    placeholder="Enter your title"
                    maxLength={100}
                    required
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                  <p className="text-xs text-zinc-500">{formData.title.length}/100 characters</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Description <span className="text-orange-500">*</span>
                  </label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value.slice(0, 2000))}
                    placeholder="Describe your event..."
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-300 resize-none focus-visible:ring-1 focus-visible:ring-orange-500 focus-visible:ring-offset-0"
                    maxLength={2000}
                    required
                  />
                  <p className="text-xs text-zinc-500">{formData.description.length}/2000 characters</p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Category <span className="text-orange-500">*</span></label>
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

                {/* Private Toggle */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-white flex items-center gap-2"><Lock className="h-4 w-4" /> Private Event</span>
                      <span className="block text-xs text-zinc-500 mt-1">Make this event invite-only and hidden from explore</span>
                    </div>
                    <Switch
                      checked={formData.is_private}
                      onCheckedChange={(checked) => {
                        setFormData((prev) => ({
                          ...prev,
                          is_private: checked,
                          visibility: checked ? 'private' : 'public',
                        }));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                  {formData.is_private && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Require Manual Approval</Label>
                      <Switch
                        checked={formData.require_approval}
                        onCheckedChange={(checked) => {
                          setFormData((prev) => ({ ...prev, require_approval: checked }));
                          setHasUnsavedChanges(true);
                        }}
                      />
                    </div>
                  )}
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
                    <p className="text-sm text-zinc-400 mb-2">Paste an image URL below</p>
                    <p className="text-xs text-zinc-500 mb-3">Recommended aspect ratio: 16:9</p>
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
                <h2 className="text-sm font-bold text-zinc-400">Date, Location & Media <span className="text-orange-500">*</span></h2>

                {/* Dates & Times */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">Start Date <span className="text-orange-500"></span></label>
                    <div className="relative group">
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        min={todayStr}
                        max={maxDateStr}
                        onChange={(e) => handleChange('date', e.target.value)}
                        required
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-600"
                      />
                      <Calendar className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">Start Time <span className="text-orange-500"></span></label>
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
                    <label className="text-xs text-zinc-500">End Date <span className="text-orange-500"></span></label>
                    <div className="relative group">
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        min={formData.date || todayStr}
                        max={maxDateStr}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        required
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-zinc-600"
                      />
                      <Calendar className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-zinc-500">End Time <span className="text-orange-500"></span></label>
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
                  <label className="text-xs text-zinc-500">Time Zone <span className="text-orange-500"></span></label>
                  <Select value={formData.time_zone} onValueChange={(value) => handleChange('time_zone', value)} required>
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-zinc-300">
                      <SelectValue placeholder="Select Time Zone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900/95 border-zinc-800 max-h-72">
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value} className="text-zinc-300">
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Location <span className="text-orange-500">*</span></label>
                  <div className="relative group">
                    <LocationAutocomplete
                      value={formData.location}
                      onSelect={(location) => {
                        setFormData((prev) => ({
                          ...prev,
                          location: location.address,
                          latitude: location.latitude,
                          longitude: location.longitude,
                        }));
                        setHasUnsavedChanges(true);
                      }}
                      onChange={(value) => handleChange('location', value)}
                      placeholder="Search location"
                    />
                    <MapPin className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={16} />
                  </div>
                  <div className="rounded-lg overflow-hidden border border-zinc-800">
                    <LocationPickerMap
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onChange={({ latitude, longitude, address }) => {
                        setFormData((prev) => ({
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

                {/* Settings */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Max Attendees</label>
                  <Input
                    id="max_attendees"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.max_attendees}
                    onChange={(e) => handleChange('max_attendees', e.target.value)}
                    placeholder="Leave empty for unlimited"
                    className="bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-600"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500">Tags</label>
                  <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-2 min-h-[44px] flex flex-wrap gap-2">
                    {formData.tags
                      .split(',')
                      .map((t) => t.trim())
                      .filter((t) => t.length > 0)
                      .map((tag) => (
                        <div key={tag} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-md flex items-center gap-1 border border-zinc-700">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const next = formData.tags
                                .split(',')
                                .map((t) => t.trim())
                                .filter((t) => t.length > 0 && t !== tag)
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
                      placeholder="Add tags separated by commas (e.g. music, networking)"
                      className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs placeholder-zinc-500 flex-1 min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleBack} className="text-zinc-400 hover:text-white">
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
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
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
