"use client";

import { useAuth } from '@/contexts/AuthContext';
import { PricingSection } from '@/components/PricingSection';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { VideoModal } from '@/components/VideoModal';

// Redirect logic for logged-in users
function LandingPageContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isTrialLoading } = useTrialStatus();
  const router = useRouter();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (!isAuthLoading && !isTrialLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isAuthLoading, isTrialLoading, router]);

  // Show loading while checking auth status
  if (isAuthLoading || isTrialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4 mx-auto"></div>
          <p className="text-foreground">Lade...</p>
        </div>
      </div>
    );
  }

  // Don't render landing page content if user is logged in
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Hero Section - Resend inspired */}
      <section className="relative py-32 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight"
            >
              Video Management
              <br />
              <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                für Profis
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Die beste Lösung für Content Creator und Agenturen. 
              Verwalten Sie Videos, planen Sie Content und automatisieren Sie Workflows.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              {/* Primary CTA with Resend-style glow */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/login')}
                className="group relative px-8 py-4 bg-neutral-800 text-white rounded-3xl font-medium text-lg
                         border border-neutral-700
                         hover:bg-white hover:text-black hover:border-white
                         hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]
                         transition-all duration-300 ease-out
                         focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
              >
                <span className="flex items-center gap-2">
                  Get Started
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </motion.button>
              
              {/* Secondary CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsVideoModalOpen(true)}
                className="px-8 py-4 bg-transparent text-white rounded-3xl font-medium text-lg
                         border border-neutral-600 hover:border-neutral-400
                         hover:bg-neutral-800
                         transition-all duration-300 ease-out"
              >
                Demo ansehen
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Einfache Preisgestaltung
            </h2>
            <p className="text-lg text-neutral-400">
              Wählen Sie den Plan, der zu Ihnen passt
            </p>
          </div>
          <PricingSection />
        </div>
      </section>

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoId="S1cnQG0-LP4"
      />
    </div>
  );
}

export default function LandingPage() {
  return <LandingPageContent />;
}

