import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import AuthInitializer from '@/app/(app)/_components/auth-initializer';
import FramerProvider from '@/components/FramerProvider';
import { Footer } from '@/components/common/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bonfire - Discover Local Events',
  description:
    'Real-time, map-based social platform for discovering and organizing micro-events',
  verification: {
    google: '5vrJXyo409ehWmpWcwceOCzrkTJ6GmSmgPjTHQZIprA',
  },
  icons: {
    icon: [
      { url: '/app/android-chrome-512x512.png', sizes: '512x512', type: 'image/png'},

      { url: '/app/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/app/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/app/favicon.ico',
    apple: '/app/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-neutral-950 text-white selection:bg-orange-500/30`}
        suppressHydrationWarning
      >
        {/* Background Gradients for Landing Page */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>
        
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthInitializer />
          <FramerProvider>
            <div className="relative z-10">
              {children}
            </div>
          </FramerProvider>
          <Toaster />
          {/* <Footer /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
