'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import BonfireLoadingBar from '@/components/ui/bonfire-loading-bar';

export default function RootPage() {
  const router = useRouter();
  const { user, loading, initialize } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initialize();
    const timeout = setTimeout(() => {
      setSplashDone(true);
    }, 4100);
    return () => clearTimeout(timeout);
  }, [initialize]);

  useEffect(() => {
    if (typeof window !== 'undefined' && splashDone && !loading) {
      const timeout = setTimeout(() => {
        if (user) {
          router.push('/home');
        } else {
          router.push('/login');
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, splashDone, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100/60 to-red-100/60 dark:from-[#0f0f0f] dark:to-[#1a1a1a] flex items-center justify-center px-6">
      <div className="text-center animate-fade-in-up space-y-4">
        <div className="inline-block">
          <Image
            src="/bonfire-logo.png"
            alt="Bonfire Logo"
            width={300}
            height={300}
            className="rounded-xl drop-shadow-md"
            priority
          />
        </div>
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
          Bonfire
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Discover local events happening around you
        </p>
        <div className="pt-6 flex items-center justify-center">
          <BonfireLoadingBar duration={9} height="lg" />
        </div>
      </div>
    </div>
  );
}