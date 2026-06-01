'use client';

import { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';

interface FlameLogoProps {
  className?: string;
  size?: number;
  autoplay?: boolean;
}

export function FlameLogo({ className, size = 64, autoplay = true }: FlameLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Simple flame animation data (inline for demo)
    const flameAnimationData = {
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 60,
      w: 100,
      h: 100,
      nm: "Flame",
      ddd: 0,
      assets: [],
      layers: [
        {
          ddd: 0,
          ind: 1,
          ty: 4,
          nm: "Flame",
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [50, 50, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
          },
          ao: 0,
          shapes: [
            {
              ty: "gr",
              it: [
                {
                  ty: "el",
                  p: { a: 0, k: [0, 0] },
                  s: { a: 1, k: [
                    { t: 0, s: [30, 40] },
                    { t: 30, s: [35, 45] },
                    { t: 60, s: [30, 40] }
                  ] }
                },
                {
                  ty: "fl",
                  c: { a: 1, k: [
                    { t: 0, s: [1, 0.4, 0.1, 1] },
                    { t: 15, s: [1, 0.6, 0.2, 1] },
                    { t: 30, s: [1, 0.8, 0.3, 1] },
                    { t: 45, s: [1, 0.6, 0.2, 1] },
                    { t: 60, s: [1, 0.4, 0.1, 1] }
                  ] }
                }
              ]
            }
          ],
          ip: 0,
          op: 60,
          st: 0
        }
      ]
    };

    animationRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay,
      animationData: flameAnimationData,
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
      }
    };
  }, [autoplay]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}