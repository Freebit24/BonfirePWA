'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
import { ArrowLeft, MapPin, Calendar, Clock, Users, Tag } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
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

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore(); // ✅ updated
  const { createEvent } = useEventStore();

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
  });

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Fill in the details to create your event
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe your event"
                    rows={4}
                    required
                  />
                </div>

                {/* Image URL */}
                <div>
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-sm text-gray-500 mt-1">Optional: Add a URL for your event image</p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <span className="mr-2">{category.icon}</span>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility */}
                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility *</Label>
                  <Select value={formData.visibility} onValueChange={(value) => handleChange('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private (invite-only)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.visibility === 'private' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Only invited users can see and join this event.</p>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Location *
                  </Label>
                  <LocationAutocomplete
                    value={formData.location}
                    onSelect={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        location: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }));
                      setHasUnsavedChanges(true);
                    }}
                    onChange={(value) => handleChange('location', value)}
                    placeholder="Search for a location"
                  />
                </div>

                {/* Start Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Start Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      min={todayStr}
                      max={maxDateStr}
                      onChange={(e) => handleChange('date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="time">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Start Time *
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleChange('time', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* End Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="end_date">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      End Date *
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      min={formData.date || todayStr}
                      max={maxDateStr}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">
                      <Clock className="inline h-4 w-4 mr-1" />
                      End Time *
                    </Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => handleChange('end_time', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Time Zone */}
                <div>
                  <Label htmlFor="time_zone">Time Zone *</Label>
                  <Select
                    value={formData.time_zone}
                    onValueChange={(value) => handleChange('time_zone', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Attendees */}
                <div>
                  <Label htmlFor="max_attendees">
                    <Users className="inline h-4 w-4 mr-1" />
                    Max Attendees
                  </Label>
                  <Input
                    id="max_attendees"
                    type="number"
                    min="1"
                    value={formData.max_attendees}
                    onChange={(e) => handleChange('max_attendees', e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Tags
                  </Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="music, outdoor, family-friendly (comma-separated)"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
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
