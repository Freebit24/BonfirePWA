import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import AuthInitializer from '@/app/(app)/_components/auth-initializer';
import FramerProvider from '@/components/FramerProvider';
import { Footer } from '@/components/common/footer';
import AnalyticsTracker from './analytics-tracker';

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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {gaId ? (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        ) : null}
      </head>
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
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AnalyticsTracker />
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
