import type { Metadata } from 'next';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './landing.css';

export const metadata: Metadata = {
  title: 'Bonfire | The Modern Community Platform',
  description: 'Build a thriving community on your own terms. No algorithms, just connection.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-orange-500/30 relative">
      {/* Background Gradients - Using direct background styles */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 10% 20%, rgba(251, 146, 60, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.05) 0%, transparent 60%)
          `
        }}
      />

      {/* Navbar with higher z-index */}
      <div className="relative z-10">
        <Navbar />
      </div>

      {/* Main content with higher z-index */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Footer with higher z-index */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}