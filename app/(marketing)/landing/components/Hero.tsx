"use client";

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Hero() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;

  const handleGetStarted = () => {
    router.push('/signup');
  };

  const handleExplore = () => {
    router.push('/home');
  };

  const handleCreateEvent = () => {
    router.push('/organizer/create');
  };

  const handleHowItWorks = () => {
    const section = document.getElementById('how-it-works');
    section?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 container mx-auto px-6 flex flex-col items-center text-center">

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl"
      >
        Find events <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600">
          worth showing up for.
        </span>
      </motion.h1>

      {/* Subhead */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-10 leading-relaxed"
      >
        Bonfire is a calm place to discover, join, and host meaningful events — without clutter, noise, or pressure.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center"
      >
        {isAuthenticated ? (
          <>
            {/* Logged IN */}
            <button
              onClick={handleExplore}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_40px_-10px_rgba(234,88,12,0.5)] hover:shadow-[0_0_60px_-15px_rgba(234,88,12,0.6)]"
            >
              Explore events
            </button>

            <button
              onClick={handleCreateEvent}
              className="px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded-xl font-semibold transition-all"
            >
              Create an event
            </button>
          </>
        ) : (
          <>
            {/* Logged OUT */}
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_40px_-10px_rgba(234,88,12,0.5)] hover:shadow-[0_0_60px_-15px_rgba(234,88,12,0.6)]"
            >
              Get started
            </button>

            <button
              onClick={handleHowItWorks}
              className="px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-800 rounded-xl font-semibold transition-all"
            >
              How Bonfire works
            </button>
          </>
        )}
      </motion.div>

      {/* Microcopy for logged out users */}
      {/* {!isAuthenticated && (
        <p className="mt-4 text-sm text-neutral-500">
          Sign in to continue.
        </p>
      )} */}

    </section>
  );
} 