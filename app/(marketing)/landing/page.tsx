import Hero from './components/Hero';
import Showcase from './components/Showcase';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Community from './components/Community';
import FinalCTA from './components/FinalCTA';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Showcase />
      <Features />
      <HowItWorks />
      <Community />
      <FinalCTA />
      <Footer />
    </div>
  );
}