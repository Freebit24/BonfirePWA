// components/FireLottie.tsx
'use client';

import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

export default function FireLottie() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anim = lottie.loadAnimation({
      container: ref.current!,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/lottie/fire.json', // where your JSON lives
    });

    return () => anim.destroy();
  }, []);

  return <div ref={ref} style={{ width: 300, height: 300 }} />;
}
