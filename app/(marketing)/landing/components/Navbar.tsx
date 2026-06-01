"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = !!user;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/landing/bonfire-logo-96.webp"
            alt="Bonfire"
            width={32}
            height={32}
            className="rounded-md transition-transform group-hover:scale-[1.03]"
            priority
          />
          <span className="text-lg font-bold text-white tracking-tight">
            Bonfire
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {/* Logged IN */}
              <Link
                href="/home"
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Go to App
              </Link>
            </>
          ) : (
            <>
              {/* Logged OUT */}
              <Link
                href="/login"
                className="hidden md:block text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}