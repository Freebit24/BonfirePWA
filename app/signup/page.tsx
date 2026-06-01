'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlameLogo } from '@/components/common/flame-logo';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function SignUpPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuthStore();

  const handleGoogleSignIn = async () => {
    try {
      const origin = window.location.origin;
      const redirectUrl = `${origin}/home`;
      await signInWithGoogle(redirectUrl);
      toast.success('Welcome to Bonfire!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-300/20 dark:bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-300/20 dark:bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-0 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
          <CardHeader className="text-center space-y-3 pb-8 pt-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex justify-center"
            >
              <Image
                src="/app/bonfire-logo.png"
                alt="Bonfire Logo"
                width={140}
                height={140}
                priority
                quality={100}
                className="drop-shadow-xl"
              />
            </motion.div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent !mt-2">
              Join the Bonfire Community
            </CardTitle>
            <CardDescription className="text-base">
              Start your journey — discover and create amazing local events
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 px-8 pb-10">
            {/* Features */}
            <div className="space-y-3 bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 rounded-lg p-4 border border-orange-200/50 dark:border-orange-800/30">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-white text-lg">🌟</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Explore Events Near You</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Find concerts, workshops, meetups, and more in your area</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-white text-lg">✨</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Host Your Own Events</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Become an organizer and bring your community together</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    <span className="text-white text-lg">💫</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Build Your Tribe</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Make lasting connections through shared experiences</p>
                </div>
              </div>
            </div>

            {/* Sign up button */}
            <div className="flex flex-col items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full py-6 text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all border-2"
                onClick={handleGoogleSignIn}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Secure sign-in powered by Google
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}