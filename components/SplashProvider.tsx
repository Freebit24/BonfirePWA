// components/SplashProvider.tsx
'use client';

import { useState, useEffect, ReactNode } from 'react';
import Image from 'next/image';
import BonfireLoadingBar from '@/components/ui/bonfire-loading-bar';

export default function SplashProvider({ children }: { children: ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShowSplash(false);
    }, 4000); // 4 seconds
    return () => clearTimeout(t);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-100/60 to-red-100/60 dark:from-[#0f0f0f] dark:to-[#1a1a1a]">
        <div className="text-center space-y-4 animate-fade-in-up px-6">
          <Image
            src="/bonfire-logo.png"
            alt="Bonfire Logo"
            width={300}
            height={300}
            className="rounded-xl drop-shadow-md"
            priority
          />
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
            Bonfire
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Discover local events happening around you
          </p>
          <div className="pt-6 flex items-center justify-center">
            <BonfireLoadingBar duration={4} height="lg" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}