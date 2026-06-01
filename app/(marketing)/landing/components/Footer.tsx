import React from "react";
import Image from 'next/image';

export default function Footer() {
  const socialLinks = [
    {
      name: "Instagram",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.467.398.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
        </svg>
      ),
      href: "https://www.instagram.com/bonfire.event/",
      gradient: "from-purple-500 via-pink-500 to-orange-500",
    },
    {
      name: "X (Twitter)",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: "https://x.com/Bonfire_Global",
      gradient: "from-gray-900 to-gray-900",
    },
    {
      name: "Discord",
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      href: "https://discord.gg/j5X84FMY",
      gradient: "from-indigo-500 to-indigo-600",
    },
  ];

  return (
    <footer className="relative bg-dark-900 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src="/landing/bonfire-logo-96.webp" alt="Bonfire" width={36} height={36} />
              <span className="text-white font-semibold text-lg">Bonfire</span>
            </div>

            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              Connecting communities through real events and meaningful experiences.
            </p>

            <div className="flex gap-3 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.name}
                  className="group relative"
                >
                  <div
                    className={`absolute -inset-1 rounded-xl blur-lg opacity-0 
                                group-hover:opacity-100 transition
                                bg-gradient-to-r ${social.gradient}`}
                  />
                  <div
                    className="relative w-9 h-9 rounded-lg bg-dark-800
                               border border-white/10 flex items-center justify-center
                               text-white/60 group-hover:text-white
                               group-hover:border-white/20 transition"
                  >
                    {social.icon}
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h5 className="text-white font-medium mb-4">Resources</h5>
            <ul className="space-y-3 text-sm text-white/60">
              <li>
                <a href="/help" className="hover:text-white transition">
                  Help Center
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="text-white font-medium mb-4">Legal</h5>
            <ul className="space-y-3 text-sm text-white/60">
              {[
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Community Guidelines", href: "/community-guidelines" },
                // { label: "Cookie Policy", href: "/cookie-policy" },
              ].map(
                (item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-white transition">
                      {item.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h5 className="text-white font-medium mb-4">Contact</h5>
            <ul className="space-y-3 text-sm text-white/60">
              <li>
                <a
                  href="mailto:bonfireglobal@gmail.com"
                  className="hover:text-white transition"
                >
                  bonfireglobal@gmail.com
                </a>
              </li>
              <li>Open to communities everywhere</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Bonfire, Inc. All rights reserved.
          </p>
          <p className="text-white/50 text-sm flex items-center gap-1">
            Made with <span className="text-bonfire-500">🔥</span> for communities
          </p>
        </div>
      </div>
    </footer>
  );
}