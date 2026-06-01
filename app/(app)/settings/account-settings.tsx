'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/utils/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Phone, Calendar, Upload, Save, X, User } from 'lucide-react';

export default function AccountSettings() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    bio: '',
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.user_metadata?.username || '',
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        bio: user.user_metadata?.bio || '',
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear username error when user types
    if (name === 'username') {
      setUsernameError('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateUsername = (username: string): boolean => {
    // Reset error
    setUsernameError('');

    // Check if username is empty
    if (!username || username.trim() === '') {
      setUsernameError('Username is required');
      return false;
    }

    // Check minimum length
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }

    // Check maximum length
    if (username.length > 20) {
      setUsernameError('Username must be less than 20 characters');
      return false;
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      setUsernameError('Username can only contain letters, numbers, underscore, and hyphen');
      return false;
    }

    // Check if starts with letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      setUsernameError('Username must start with a letter or number');
      return false;
    }

    return true;
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await db
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .maybeSingle();

      if (error) {
        console.error('Error checking username:', error);
        return true; // Assume available on error
      }

      if (data) {
        setUsernameError('Username is already taken');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return true; // Assume available on error
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    // Validate username
    if (!validateUsername(formData.username)) {
      toast.error('Please fix username errors');
      return;
    }

    setIsSaving(true);
    
    try {
      // Check username availability if it changed
      const originalUsername = user.user_metadata?.username || '';
      if (formData.username !== originalUsername) {
        const isAvailable = await checkUsernameAvailability(formData.username);
        if (!isAvailable) {
          toast.error('Username is already taken');
          setIsSaving(false);
          return;
        }
      }

      // Update auth metadata
      const { error: authError } = await db.auth.updateUser({
        data: {
          username: formData.username,
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
        }
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await db
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setUsernameError('');
    // Reset form to original values
    if (user) {
      setFormData({
        username: user.user_metadata?.username || '',
        name: user.user_metadata?.name || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        bio: user.user_metadata?.bio || '',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Profile Avatar Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Update your profile photo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <Avatar className="w-32 h-32">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-4xl">
              {user?.user_metadata?.name?.[0] || user?.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="h-4 w-4 mr-2" />
            Change Photo
          </Button>
        </CardContent>
      </Card>

      {/* Personal Information Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Username
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  className={`bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 ${
                    usernameError ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {usernameError && (
                  <p className="text-sm text-red-500 dark:text-red-400">{usernameError}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  3-20 characters, letters, numbers, underscore, and hyphen only
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-gray-900 dark:text-gray-100">
                {formData.username || 'Not provided'}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
              Full Name
            </Label>
            {isEditing ? (
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-gray-900 dark:text-gray-100">
                {formData.name || 'Not provided'}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            {isEditing ? (
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-gray-900 dark:text-gray-100">
                {formData.email || 'Not provided'}
              </div>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            {isEditing ? (
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-gray-900 dark:text-gray-100">
                {formData.phone || 'Not provided'}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-semibold">
              Bio
            </Label>
            {isEditing ? (
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Write a short bio about yourself"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md text-gray-900 dark:text-gray-100 min-h-[100px]">
                {formData.bio || 'Not provided'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Status Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Member Since</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Account Status</span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold">
              Active
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
