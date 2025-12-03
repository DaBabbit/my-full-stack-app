"use client";

import { useAuth } from '@/contexts/AuthContext';
import { PricingSection } from '@/components/PricingSection';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LandingHeader from '@/components/LandingHeader';
import HowItWorksSimple from '@/components/HowItWorksSimple';
import MinimalFAQ from '@/components/MinimalFAQ';
import LandingFooter from '@/components/LandingFooter';

const TIDYCAL_URL = 'https://tidycal.com/davidkosma/20-minute-meeting-m4ee56v';

// Redirect logic for logged-in users
function LandingPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isTrialLoading } = useTrialStatus();
  const router = useRouter();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isAuthLoading && !isTrialLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, isTrialLoading, router]);

  // Show loading while checking auth status
  if (isAuthLoading || isTrialLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white">Lade...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page content if user is logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <LandingHeader />

      {/* Hero Section - Above the Fold */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-black to-black" />
        
        {/* Subtle glow effect */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight"
            >
              12 professionelle Kurzvideos.
              <br />
              <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Jeden Monat. Automatisch.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl md:text-2xl text-neutral-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Wir übernehmen Schnitt, Posting und Strategie.
              <br className="hidden sm:block" />
              Du filmst. Wir machen den Rest.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {/* Primary CTA */}
              <motion.a
                href={TIDYCAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative px-10 py-5 bg-white text-black rounded-full font-semibold text-lg
                         hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]
                         transition-all duration-300 ease-out
                         focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              >
                <span className="flex items-center gap-2">
                  Jetzt kostenlos beraten lassen
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </motion.a>
              
              {/* Secondary CTA */}
              <motion.button
                onClick={() => router.push('/login')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 text-neutral-400 hover:text-white text-sm font-medium
                         transition-colors duration-300"
              >
                Zum Login →
              </motion.button>
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12 text-sm text-neutral-500"
            >
              ✓ Keine Mindestlaufzeit ✓ 12 Videos/Monat ✓ Monatlich kündbar
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <HowItWorksSimple />

      {/* Pricing */}
      <PricingSection />

      {/* FAQ */}
      <MinimalFAQ />

      {/* Final CTA */}
      <section className="py-20 bg-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Bereit für professionellen Content?
            </h2>
            <p className="text-neutral-400 text-lg mb-8">
              Lass uns in einem kostenlosen Gespräch deine Content-Strategie besprechen.
            </p>
            
            <motion.a
              href={TIDYCAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-block px-10 py-5 bg-white text-black rounded-full font-semibold text-lg
                       hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]
                       transition-all duration-300"
            >
              Jetzt Termin buchen
            </motion.a>

            <p className="mt-6 text-sm text-neutral-500">
              Kostenlos • 20 Minuten • Unverbindlich
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

export default function LandingPage() {
  return <LandingPageContent />;
}
