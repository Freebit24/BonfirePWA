'use client';

import { useEffect, useState } from 'react';
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
import { ArrowLeft, Calendar, Clock, Users, Tag } from 'lucide-react';
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

export default function EditEventForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore();
  const { fetchEventById, fetchEvents, selectedEvent, updateEvent } = useEventStore();

  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    location: '',
    latitude: 26.8060,
    longitude: 75.8022,
    date: '',
    time: '',
    end_date: '',
    end_time: '',
    category: '' as EventCategory,
    max_attendees: '',
    tags: '',
  });

  useEffect(() => {
    if (eventId) {
      console.log('Edit page: loading event', eventId);
      fetchEventById(eventId);
    }
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (selectedEvent) {
      const ev = selectedEvent as any;
      // compute end date/time from duration
      const start = new Date(`${ev.date}T${ev.time}`);
      const end = new Date(start.getTime() + (ev.duration || 0) * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');

      setFormData({
        title: ev.title || '',
        description: ev.description || '',
        location: ev.location || '',
        latitude: ev.latitude ?? 26.8060,
        longitude: ev.longitude ?? 75.8022,
        date: ev.date || '',
        time: ev.time || '',
        end_date: end.toISOString().split('T')[0],
        end_time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        category: ev.category || '',
        max_attendees: ev.max_attendees ? String(ev.max_attendees) : '',
        tags: (ev.tags || []).join(', '),
      });
    }
  }, [selectedEvent]);

  if (authLoading) return null;
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const performUpdate = async () => {
    if (!selectedEvent) {
      console.error('No selectedEvent to update');
      return;
    }
    console.log('performUpdate called with eventId:', selectedEvent.id);
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

      const tagsArray = formData.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);

      console.log('Calling updateEvent with data...');
      const updated = await updateEvent(selectedEvent.id, {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        date: formData.date,
        time: formData.time,
        duration: durationMinutes,
        category: formData.category,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
        tags: tagsArray,
      });

      console.log('Update completed, showing success toast');
      toast.success('Event updated successfully');

      // Refresh the master events list and the single event to ensure all views pick up changes
      try {
        if (fetchEvents) {
          await fetchEvents();
          console.log('Fetched events list after update');
        }

        // re-fetch the single event (some pages read selectedEvent or fetch on mount)
        if (fetchEventById && updated?.id) {
          await fetchEventById(updated.id);
          console.log('Re-fetched updated event:', updated.id);
        }
      } catch (err) {
        console.warn('Error refreshing events after update', err);
      }

      // Replace the route and refresh the app router to force server components to re-evaluate
      console.log('Navigating to event page and refreshing route...');
      router.replace(`/event/${selectedEvent.id}`);
      // router.replace is synchronous; call refresh to make sure server data is reloaded
      try {
        router.refresh();
      } catch (e) {
        // older Next versions or environments might not support router.refresh()
        console.debug('router.refresh not available:', e);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update event');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Edit Event</h1>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Event Title *</Label>
                    <Input id="title" placeholder="Enter event title" value={formData.title} onChange={(e) => handleChange('title', e.target.value.slice(0,48))} maxLength={48} required />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea id="description" placeholder="Describe your event..." value={formData.description} onChange={(e) => handleChange('description', e.target.value.slice(0,2000))} maxLength={2000} rows={4} required />
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

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <LocationAutocomplete value={formData.location} onChange={(location) => handleChange('location', location)} onLocationSelect={(locationData) => setFormData((prev: any) => ({ ...prev, location: locationData.address, latitude: locationData.lat, longitude: locationData.lng }))} placeholder="Search for event location..." required />
                  </div>

                  {/* Date/Time start */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date"><Calendar className="inline h-4 w-4 mr-1" /> Start Date *</Label>
                      <Input id="date" type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time"><Clock className="inline h-4 w-4 mr-1" /> Start Time *</Label>
                      <Input id="time" type="time" value={formData.time} onChange={(e) => handleChange('time', e.target.value)} required />
                    </div>
                  </div>

                  {/* End Date/Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="end_date"><Calendar className="inline h-4 w-4 mr-1" /> End Date *</Label>
                      <Input id="end_date" type="date" value={formData.end_date} onChange={(e) => handleChange('end_date', e.target.value)} min={formData.date || new Date().toISOString().split('T')[0]} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end_time"><Clock className="inline h-4 w-4 mr-1" /> End Time *</Label>
                      <Input id="end_time" type="time" value={formData.end_time} onChange={(e) => handleChange('end_time', e.target.value)} required />
                    </div>
                  </div>

                  {/* Max Attendees */}
                  <div className="space-y-2">
                    <Label htmlFor="max_attendees"><Users className="inline h-4 w-4 mr-1" /> Max Attendees</Label>
                    <Input id="max_attendees" type="number" placeholder="No limit" value={formData.max_attendees} onChange={(e) => handleChange('max_attendees', e.target.value)} min="1" />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags"><Tag className="inline h-4 w-4 mr-1" /> Tags</Label>
                    <Input id="tags" placeholder="Enter tags separated by commas" value={formData.tags} onChange={(e) => handleChange('tags', e.target.value)} />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Separate tags with commas (e.g., "networking, tech, startup")</p>
                  </div>

                  {/* Submit */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancel</Button>
                    <Button type="button" className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" disabled={loading} onClick={() => setConfirmOpen(true)}>{loading ? 'Saving...' : 'Save Changes'}</Button>
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
