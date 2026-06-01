import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import AuthInitializer from '@/app/_components/auth-initializer'; // ✅ Add this line

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bonfire - Discover Local Events',
  description: 'Real-time, map-based social platform for discovering and organizing micro-events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthInitializer /> {/* ✅ Hydrates the Zustand auth store on app load */}
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}