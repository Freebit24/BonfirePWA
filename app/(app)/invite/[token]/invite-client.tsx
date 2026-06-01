'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Header } from '@/components/common/header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { validateInviteToken, consumeInviteToken } from '@/app/actions/private-events';
import { formatDate, formatTime } from '@/utils/helpers';
import { toast } from 'sonner';
import { Calendar, Clock, User, Lock, CheckCircle, XCircle } from 'lucide-react';

interface InviteClientProps {
  token: string;
}

export default function InviteClient({ token }: InviteClientProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [validationState, setValidationState] = useState<{
    valid: boolean;
    eventTitle?: string;
    organizerName?: string;
    eventDate?: string;
    eventTime?: string;
    error?: string;
  }>({ valid: false });

  useEffect(() => {
    validateInvite();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateInvite = async () => {
    setLoading(true);
    try {
      const result = await validateInviteToken(token);
      
      if (result.success && result.data) {
        setValidationState({
          valid: true,
          eventTitle: result.data.eventTitle,
          organizerName: result.data.organizerName,
          eventDate: result.data.eventDate,
          eventTime: result.data.eventTime,
        });
      } else {
        setValidationState({
          valid: false,
          error: result.error || 'Invalid invite link',
        });
      }
    } catch (error: any) {
      console.error('Error validating invite:', error);
      setValidationState({
        valid: false,
        error: 'Failed to validate invite link',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      const returnUrl = `/invite/${token}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    setJoining(true);
    try {
      const result = await consumeInviteToken(token, user.id);
      
      if (result.success && result.data) {
        toast.success('Successfully joined the event!');
        router.push(`/event/${result.data.eventId}`);
      } else {
        toast.error(result.error || 'Failed to join event');
      }
    } catch (error: any) {
      console.error('Error joining event:', error);
      toast.error('Failed to join event');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {validationState.valid ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                      <Lock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">
                    You&apos;ve Been Invited!
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    You have been invited to join a private event
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Event Details Preview */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {validationState.eventTitle}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Organized by</p>
                          <p className="font-medium">{validationState.organizerName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                          <p className="font-medium">
                            {validationState.eventDate && formatDate(validationState.eventDate)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Time</p>
                          <p className="font-medium">
                            {validationState.eventTime && formatTime(validationState.eventTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant="secondary" className="mt-4">
                      <Lock className="h-3 w-3 mr-1" />
                      Private Event
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    {!user && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          You need to sign in to join this event
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleJoin}
                      disabled={joining}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg py-6"
                    >
                      {joining ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Joining...
                        </>
                      ) : user ? (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Accept Invite & Join Event
                        </>
                      ) : (
                        'Sign In to Join'
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => router.push('/home')}
                      className="w-full"
                    >
                      Maybe Later
                    </Button>
                  </div>

                  {/* Privacy Notice */}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
                    <Lock className="h-4 w-4 inline mr-1" />
                    This is a private event. Only invited users can join.
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 border-red-200 dark:border-red-800">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl">
                    Invalid Invite Link
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {validationState.error || 'This invite link is not valid'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      This invite link may have expired, been used, or is invalid. 
                      Please contact the event organizer for a new invite link.
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => router.push('/home')}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Browse Public Events
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
