'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { db } from '@/utils/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Phone, Calendar, Upload, Save, X, User } from 'lucide-react';

export default function AccountSettings() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  // Keep avatar in sync with user data and provide a fallback
  useEffect(() => {
    const fallbackAvatar = user?.user_metadata?.picture || 'https://api.dicebear.com/7.x/initials/svg?seed=User';
    const preferredAvatar = user?.user_metadata?.avatar_url || fallbackAvatar;
    setAvatarSrc(preferredAvatar);
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

  const handlePhotoSave = async () => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    if (!avatarUrl.trim()) {
      setErrorMessage('Please enter a valid image URL');
      return;
    }

    const urlLower = avatarUrl.toLowerCase();

    // Case A: Check for GIF
    if (urlLower.includes('.gif')) {
      setErrorMessage('Animated GIFs are not supported. Please use a static image.');
      return;
    }

    // Case B: Check for valid format
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidExtension = allowedExtensions.some(ext => urlLower.endsWith(ext));
    
    if (!hasValidExtension) {
      setErrorMessage('Invalid image format. Please use a direct link ending in .jpg, .png, or .webp.');
      return;
    }

    // Clear errors and proceed with save
    setErrorMessage('');
    setIsSavingPhoto(true);
    
    try {
      // Update auth metadata with new avatar URL
      const { error: authError } = await db.auth.updateUser({
        data: {
          avatar_url: avatarUrl,
        }
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await db
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Profile picture updated successfully');
      setIsPhotoModalOpen(false);
      setAvatarUrl('');
      setAvatarSrc(avatarUrl);
    } catch (error: any) {
      console.error('Error updating profile picture:', error);
      toast.error(error?.message || 'Failed to update profile picture');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handlePhotoCancel = () => {
    setIsPhotoModalOpen(false);
    setAvatarUrl('');
    setErrorMessage('');
  };

  const handlePhotoReset = async () => {
    if (!user) {
      toast.error('No user found');
      return;
    }

    // Get the original user image (from OAuth provider like Google)
    const originalImage = user.user_metadata?.picture || user.user_metadata?.avatar_url || '';
    
    if (!originalImage) {
      toast.error('No original profile picture found');
      return;
    }

    setIsSavingPhoto(true);
    
    try {
      // Reset to original avatar URL
      const { error: authError } = await db.auth.updateUser({
        data: {
          avatar_url: originalImage,
        }
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await db
        .from('profiles')
        .update({
          avatar_url: originalImage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Profile picture reset to original');
      setIsPhotoModalOpen(false);
      setAvatarUrl('');
      setAvatarSrc(originalImage);
    } catch (error: any) {
      console.error('Error resetting profile picture:', error);
      toast.error(error?.message || 'Failed to reset profile picture');
    } finally {
      setIsSavingPhoto(false);
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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Profile Picture Section */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
          <Card className="bg-white/5 border border-white/10 rounded-xl">
            <CardContent className="flex flex-row items-center gap-6 p-6">
              <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 border border-white/10">
                <img
                  src={avatarSrc || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || 'https://api.dicebear.com/7.x/initials/svg?seed=User'}
                  alt="Profile"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                  onError={() => setAvatarSrc(user?.user_metadata?.picture || 'https://api.dicebear.com/7.x/initials/svg?seed=User')}
                />
              </div>
              <div className="flex-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mb-2"
                  onClick={() => setIsPhotoModalOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change Photo
                </Button>
                <p className="text-xs text-gray-500">Enter an image URL</p>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Personal Information Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Personal Information</h2>
          {!isEditing && (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="bg-transparent text-sm font-medium hover:text-white text-gray-300 hover:bg-transparent"
            >
              Edit
            </Button>
          )}
        </div>
        <Card className="bg-white/5 border border-white/10 rounded-xl">
          <CardContent className="space-y-6 p-6">
            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-gray-400 flex items-center gap-2">
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
                    className={`bg-transparent border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-0 ${
                      usernameError ? 'border-red-500 focus:border-red-500 focus:ring-0' : ''
                    }`}
                  />
                  {usernameError && (
                    <p className="text-sm text-red-400">{usernameError}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    3-20 characters, letters, numbers, underscore, and hyphen only
                  </p>
                </div>
              ) : (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {formData.username || 'Not provided'}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-400">
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="bg-transparent border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-0"
                />
              ) : (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {formData.name || 'Not provided'}
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-400 flex items-center gap-2">
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
                  className="bg-transparent border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-0"
                />
              ) : (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {formData.email || 'Not provided'}
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-400 flex items-center gap-2">
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
                  className="bg-transparent border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-0"
                />
              ) : (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
                  {formData.phone || 'Not provided'}
                </div>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium text-gray-400">
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
                  className="w-full px-3 py-2 bg-transparent border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:ring-0 focus:outline-none resize-none"
                />
              ) : (
                <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white min-h-[100px]">
                  {formData.bio || 'Not provided'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-4 border-t border-white/10">
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
                  className="flex-1 bg-transparent border border-white/10 hover:bg-white/5 rounded-lg text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Status Card */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Account Status</h2>
        <Card className="bg-white/5 border border-white/10 rounded-xl">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Member Since</span>
              </div>
              <span className="font-semibold text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">Account Status</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                Active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      </motion.div>

      {/* Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handlePhotoCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1E1E1E] border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl relative"
          >
            {/* Close Button */}
            <button
              onClick={handlePhotoCancel}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              disabled={isSavingPhoto}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title and Subtitle */}
            <h2 className="text-xl font-bold text-white mb-1">Update Profile Picture</h2>
            <p className="text-sm text-gray-400 mb-6">Enter a link to an image or reset to your default.</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="avatar-url" className="text-sm font-medium text-gray-400">
                  Image URL
                </Label>
                <Input
                  id="avatar-url"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setErrorMessage(''); // Clear error when user types
                  }}
                  placeholder="https://example.com/avatar.jpg"
                  className={`w-full bg-transparent border rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                    errorMessage 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-white/10 focus:border-orange-500 focus:ring-orange-500'
                  }`}
                  disabled={isSavingPhoto}
                />
                {errorMessage && (
                  <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 mt-6">
                <Button
                  onClick={handlePhotoSave}
                  disabled={isSavingPhoto}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingPhoto ? 'Saving...' : 'Save Update'}
                </Button>
                <Button
                  onClick={handlePhotoReset}
                  disabled={isSavingPhoto}
                  className="w-full bg-transparent hover:bg-transparent text-gray-400 hover:text-white text-sm"
                >
                  Reset to Google Picture
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
