'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Sparkles, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function WelcomePage() {
  const { user, updateUserProfile, supabase } = useAuth();
  const router = useRouter();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    // If no user, redirect to login
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Check for referral information
  useEffect(() => {
    const checkReferral = async () => {
      if (!user) return;

      try {
        console.log('[Welcome] Checking referral for user:', user.id);
        
        // Check if user was referred
        const { data: referral, error: refError } = await supabase
          .from('referrals')
          .select(`
            id,
            referrer_user_id,
            referral_code,
            status
          `)
          .eq('referred_user_id', user.id)
          .single();

        console.log('[Welcome] Referral query result:', { referral, error: refError });

        if (!refError && referral) {
          // Now get the referrer's details
          const { data: referrerData, error: referrerError } = await supabase
            .from('users')
            .select('firstname, lastname')
            .eq('id', referral.referrer_user_id)
            .single();

          console.log('[Welcome] Referrer data:', { referrerData, error: referrerError });
          
          if (!referrerError && referrerData && referrerData.firstname && referrerData.lastname) {
            setReferrerName(`${referrerData.firstname} ${referrerData.lastname}`);
            console.log('[Welcome] Referrer name set:', `${referrerData.firstname} ${referrerData.lastname}`);
          }
        } else if (refError) {
          console.log('[Welcome] No referral found or error:', refError);
        }
      } catch (err) {
        console.error('[Welcome] Error checking referral:', err);
      }
    };

    checkReferral();
  }, [user, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!firstname.trim() || !lastname.trim()) {
      setError('Bitte gib deinen Vor- und Nachnamen ein.');
      return;
    }

    if (firstname.trim().length < 2 || lastname.trim().length < 2) {
      setError('Vor- und Nachname müssen mindestens 2 Zeichen lang sein.');
      return;
    }

    setIsLoading(true);

    try {
      await updateUserProfile(firstname, lastname);
      
      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <span className="loading loading-ring loading-lg text-white"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"></div>
      </div>

      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-8 md:p-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-3">
              <Image
                src="/kosmamedia-logo.svg"
                alt="kosmamedia Logo"
                width={48}
                height={48}
                className="filter invert"
              />
              <span className="text-2xl font-bold text-white">kosmamedia</span>
            </div>
          </div>

          {/* Welcome Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Willkommen bei kosmamedia! 🎉
            </h1>
            <p className="text-neutral-400 text-lg">
              Lass uns mit deinem Namen beginnen
            </p>
          </div>

          {/* Referral Info Box */}
          {referrerName && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
            >
              <p className="text-blue-300 text-center">
                🎉 <strong>Du wurdest durch {referrerName} geworben!</strong>
              </p>
              <p className="text-blue-200 text-sm text-center mt-2">
                Schließe ein Abo ab, um deinem Freund 250€ Rabatt zu ermöglichen.
              </p>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Firstname */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Vorname *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                    placeholder="Max"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Lastname */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Nachname *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                    placeholder="Mustermann"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-white hover:bg-neutral-100 text-black rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-md"></span>
              ) : (
                <>
                  <span>Los geht&apos;s</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <p className="text-center text-neutral-500 text-sm mt-6">
            Du kannst diese Informationen jederzeit in deinen Einstellungen ändern
          </p>
        </div>
      </motion.div>
    </div>
  );
}

