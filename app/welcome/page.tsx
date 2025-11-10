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
        
        // First, get the referral code from DB or localStorage
        const { data: userData } = await supabase
          .from('users')
          .select('pending_referral_code')
          .eq('id', user.id)
          .single();

        let referralCode = userData?.pending_referral_code;
        
        if (!referralCode) {
          referralCode = localStorage.getItem('referral_code');
          console.log('[Welcome] Got referral code from localStorage:', referralCode);
        } else {
          console.log('[Welcome] Got referral code from DB:', referralCode);
        }

        if (!referralCode) {
          console.log('[Welcome] No referral code found');
          return;
        }

        // Use API route to get referrer info (bypasses RLS)
        console.log('[Welcome] Fetching referrer info via API for code:', referralCode);
        const response = await fetch('/api/referrals/referrer-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode })
        });

        const result = await response.json();
        console.log('[Welcome] Referrer info API response:', result);

        if (response.ok && result.success && result.referrer) {
          setReferrerName(result.referrer.fullName);
          console.log('[Welcome] Referrer name set:', result.referrer.fullName);
        } else {
          console.log('[Welcome] No referrer found or error:', result.error);
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
      // First, update the user profile
      await updateUserProfile(firstname, lastname);
      console.log('[Welcome] User profile updated successfully');
      
      // Now check if there's a pending referral code to claim
      if (user) {
        console.log('[Welcome] Checking for pending referral code for user:', user.id);
        
        // Check both DB and localStorage (fallback)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('pending_referral_code')
          .eq('id', user.id)
          .single();

        console.log('[Welcome] User data query result:', { userData, error: userError });

        // Try DB first, then localStorage as fallback
        let referralCodeToUse = userData?.pending_referral_code;
        let isFromLocalStorage = false;

        if (!referralCodeToUse) {
          const localStorageCode = localStorage.getItem('referral_code');
          if (localStorageCode) {
            console.log('[Welcome] Found referral code in localStorage:', localStorageCode);
            referralCodeToUse = localStorageCode;
            isFromLocalStorage = true;
          }
        }

        if (referralCodeToUse) {
          console.log('[Welcome] Found referral code:', referralCodeToUse, 'from:', isFromLocalStorage ? 'localStorage' : 'DB');
          
          try {
            // Claim the referral
            const response = await fetch('/api/referrals/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: referralCodeToUse,
                userId: user.id
              })
            });

            const responseText = await response.text();
            console.log('[Welcome] Referral claim response:', { status: response.status, body: responseText });

            if (response.ok) {
              console.log('[Welcome] Successfully claimed referral');
              
              // Clean up pending_referral_code from DB
              const { error: cleanupError } = await supabase
                .from('users')
                .update({ pending_referral_code: null })
                .eq('id', user.id);

              if (cleanupError) {
                console.error('[Welcome] Failed to cleanup pending_referral_code:', cleanupError);
              } else {
                console.log('[Welcome] Successfully cleaned up pending_referral_code');
              }

              // Clean up localStorage if it was used
              if (isFromLocalStorage) {
                localStorage.removeItem('referral_code');
                console.log('[Welcome] Cleaned up referral code from localStorage');
              }
            } else {
              console.error('[Welcome] Failed to claim referral:', responseText);
            }
          } catch (claimError) {
            console.error('[Welcome] Error claiming referral:', claimError);
          }
        } else {
          console.log('[Welcome] No pending referral code found in DB or localStorage');
        }
      }
      
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

