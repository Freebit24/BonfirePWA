'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BonfireLoadingBarProps {
  duration?: number; // seconds
  height?: 'sm' | 'md' | 'lg';
}

const heightMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export default function BonfireLoadingBar({
  duration = 3,
  height = 'md',
}: BonfireLoadingBarProps) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setKey((prev) => prev + 1);
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className={cn('w-full rounded-full overflow-hidden bg-orange-100 dark:bg-gray-800 shadow-inner', heightMap[height])}>
      <div
        key={key}
        className={cn(
          'animate-[bonfireSlide_linear_forwards]',
          'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600',
          'w-full',
          heightMap[height]
        )}
        style={{
          animationDuration: `${duration}s`,
        }}
      />
      <style jsx>{`
        @keyframes bonfireSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}