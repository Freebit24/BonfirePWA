"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Showcase() {
  // Carousel images: ensure feed screenshot is first
  const SCREENSHOTS = [
    '/landing/feed-screenshot.png',
    '/landing/organiser-screenshot.png',
    '/landing/calender-screenshot.png',
  ];

  const [index, setIndex] = useState(0);

  const next = () => setIndex((i) => (i + 1) % SCREENSHOTS.length);
  const prev = () => setIndex((i) => (i - 1 + SCREENSHOTS.length) % SCREENSHOTS.length);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative px-4 md:px-0 mt-24 md:mt-32">
      <div className="container mx-auto max-w-6xl flex flex-col items-center text-center">

        {/* Intent-setting line */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-sm md:text-base text-neutral-400 max-w-xl mb-10"
        >
          A clear view of what’s happening — without the noise.
        </motion.p>

        {/* Screenshot container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-full rounded-2xl border border-neutral-800/70 bg-neutral-900/40 backdrop-blur-sm p-2 md:p-4
                     shadow-[0_20px_80px_-30px_rgba(0,0,0,0.85)]"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            <div className="flex-1 ml-4 h-5 bg-neutral-800/40 rounded-md max-w-sm" />
          </div>

          {/* Screenshot carousel */}
          <div
            className="relative aspect-[16/10] rounded-lg overflow-hidden
                       bg-gradient-to-b from-neutral-900 via-neutral-900/80 to-neutral-950"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={SCREENSHOTS[index]}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <Image
                  src={SCREENSHOTS[index]}
                  alt="Bonfire screenshot"
                  fill
                  className="object-contain opacity-90"
                  priority={index === 0}
                />
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
              <button
                aria-label="Previous"
                onClick={prev}
                className="pointer-events-auto w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/60 hover:bg-neutral-800/80 border border-neutral-700 text-neutral-200 flex items-center justify-center backdrop-blur-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                aria-label="Next"
                onClick={next}
                className="pointer-events-auto w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/60 hover:bg-neutral-800/80 border border-neutral-700 text-neutral-200 flex items-center justify-center backdrop-blur-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Radial vignette (focus inward) */}
            <div
              className="absolute inset-0 pointer-events-none
                         bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_60%,rgba(0,0,0,0.25)_100%)]"
            />

            {/* Horizontal edge softening (restores perceived margins) */}
            <div
              className="absolute inset-0 pointer-events-none
                         bg-gradient-to-r from-neutral-950/20 via-transparent to-neutral-950/20"
            />
          </div>
        </motion.div>

        {/* Quiet reassurance line */}
        <p className="mt-6 text-xs md:text-sm text-neutral-500">
          Thoughtfully curated events, shown clearly.
        </p>

      </div>
    </section>
  );
}