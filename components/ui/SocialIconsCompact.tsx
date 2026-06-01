'use client';

import React from 'react';

const socials = [
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/bonfire.event/',
    glow: 'from-purple-500 via-pink-500 to-orange-500',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: 'https://x.com/Bonfire_Global',
    glow: 'from-neutral-700 to-neutral-900',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
       </svg>
    ),
  },
  {
    name: 'Discord',
    href: 'https://discord.gg/WXUFKQ8n',
    glow: 'from-indigo-500 to-indigo-600',
    icon: (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
       </svg>
    ),
  },
];

export default function SocialIconsCompact() {
  return (
    <div className="flex items-center gap-4 px-3 py-2">
      {socials.map(social => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative"
        >
          <div
            className={`
              absolute -inset-1 rounded-2xl
              bg-gradient-to-br ${social.glow}
              blur-xl opacity-0
              group-hover:opacity-100
              transition-opacity duration-300
            `}
          />
          <div
            className="
              relative w-14 h-14 rounded-2xl
              bg-dark-800/60
              backdrop-blur-sm
              border border-white/10
              flex items-center justify-center
              transition-all duration-300
              group-hover:scale-105
            "
          >
            {social.icon}
          </div>
        </a>
      ))}
    </div>
  );
}
