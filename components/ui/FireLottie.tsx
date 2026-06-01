// components/FireLottie.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';

// Cache animation data to avoid repeated fetches
let cachedAnimationData: any = null;
let cachedAnimationPromise: Promise<any> | null = null;

async function fetchAnimationData() {
  if (cachedAnimationData) return cachedAnimationData;
  if (cachedAnimationPromise) return cachedAnimationPromise;
  
  cachedAnimationPromise = fetch('/lottie/fire.json')
    .then(r => r.json())
    .then(data => {
      cachedAnimationData = data;
      cachedAnimationPromise = null;
      return data;
    });
  
  return cachedAnimationPromise;
}

export default function FireLottie() {
  const ref = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAnimation() {
      if (!ref.current) return;

      try {
        // Lazy-load lottie-web with lightweight SVG renderer only
        const lottie = (await import('lottie-web/build/player/lottie_svg')).default;
        
        if (!mounted || !ref.current) return;

        // Fetch cached animation data
        const animationData = await fetchAnimationData();
        
        if (!mounted || !ref.current) return;

        // Set quality for better performance
        lottie.setQuality('medium');

        animRef.current = lottie.loadAnimation({
          container: ref.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
          rendererSettings: {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
            hideOnTransparent: true,
          },
        });

        setIsReady(true);
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      }
    }

    loadAnimation();

    return () => {
      mounted = false;
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={ref} 
      style={{ 
        width: 300, 
        height: 300,
        opacity: isReady ? 1 : 0,
        transition: 'opacity 0.3s ease-in-out',
      }} 
    />
  );
}
