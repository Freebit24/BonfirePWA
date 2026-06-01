"use client";

import { usePathname } from "next/navigation";
import { Instagram, Twitter, MessageCircle } from "lucide-react";

const HIDDEN_PREFIXES = [
  "/organizer",
  "/checkout",
  "/rsvp",
];

export function Footer() {
  const pathname = usePathname();

  const shouldHide = HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));
  if (shouldHide) return null;

  const year = new Date().getFullYear();

  const socials = [
    { label: "Instagram", href: "https://www.instagram.com/bonfire.event/", Icon: Instagram },
    { label: "X / Twitter", href: "https://x.com/Bonfire_Global", Icon: Twitter },
    { label: "Discord", href: "https://discord.gg/", Icon: MessageCircle },
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Bonfire</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Built for meaningful gatherings.</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">© {year} Bonfire</p>
        </div>
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          {socials.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
            >
              <Icon className="h-5 w-5 opacity-80" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
