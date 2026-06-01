'use client';

import { useState } from 'react';
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

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthStore(); // ✅ updated
  const { createEvent } = useEventStore();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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

  // ✅ Wait for auth to hydrate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  // ✅ Redirect if no user
  if (!user) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        date: formData.date,
        time: formData.time,
        duration: durationMinutes,
        category: formData.category,
        organizer_id: user.id,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : undefined,
        attendees_count: 0,
        tags: tagsArray,
        status: 'active',
      });

      toast.success('Event created successfully!');
      router.push('/organizer');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Create New Event</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title">Event Title *</Label>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.title.length}/48
                      </span>
                    </div>
                    <Input
                      id="title"
                      placeholder="Enter event title"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value.slice(0, 48))}
                      maxLength={48}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description *</Label>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.description.length}/2000
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Describe your event..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value.slice(0, 2000))}
                      maxLength={2000}
                      rows={4}
                      required
                    />
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
                  <Label htmlFor="location">
                    Location *
                  </Label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(location) => handleChange('location', location)}
                    onLocationSelect={(locationData) => {
                      // Update form data with location details
                      setFormData(prev => ({
                        ...prev,
                        location: locationData.address,
                        latitude: locationData.lat,
                        longitude: locationData.lng,
                      }));
                    }}
                    placeholder="Search for event location..."
                    required
                  />
                  {/* Optional: Show selected location details */}
                  {formData.latitude !== 26.8060 && formData.longitude !== 75.8022 && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      📍 Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </div>
                  )}
                </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        Start Date *
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleChange('date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
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
                    <div className="space-y-2">
                      <Label htmlFor="end_date">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        End Date *
                      </Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleChange('end_date', e.target.value)}
                        min={formData.date || new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
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

                  {/* Max Attendees */}
                  <div className="space-y-2">
                    <Label htmlFor="max_attendees">
                      <Users className="inline h-4 w-4 mr-1" />
                      Max Attendees
                    </Label>
                    <Input
                      id="max_attendees"
                      type="number"
                      placeholder="No limit"
                      value={formData.max_attendees}
                      onChange={(e) => handleChange('max_attendees', e.target.value)}
                      min="1"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags">
                      <Tag className="inline h-4 w-4 mr-1" />
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      placeholder="Enter tags separated by commas"
                      value={formData.tags}
                      onChange={(e) => handleChange('tags', e.target.value)}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Separate tags with commas (e.g., "networking, tech, startup")
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Event'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}