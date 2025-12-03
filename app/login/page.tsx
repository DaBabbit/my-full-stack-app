'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { motion } from 'framer-motion';
import { Hourglass, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Check if we're in production (not preview or development)
const isProduction = process.env.NEXT_PUBLIC_APP_URL === 'https://www.kosmamedia.de';

function ComingSoonScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Startseite
        </Link>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-12 border border-neutral-800 text-center"
        >
          {/* Animated Hourglass */}
          <motion.div
            animate={{
              rotateZ: [0, 180, 180, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              times: [0, 0.4, 0.6, 1],
              ease: "easeInOut"
            }}
            className="inline-flex items-center justify-center w-24 h-24 mb-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full"
          >
            <Hourglass className="w-12 h-12 text-white" />
          </motion.div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Noch in Arbeit
          </h1>
          
          {/* Subtext */}
          <p className="text-xl text-neutral-300 mb-6">
            Das neue Kundenportal erscheint bald!
          </p>

          {/* Info Box */}
          <div className="bg-neutral-800/50 rounded-2xl p-6 border border-neutral-700 mb-8">
            <p className="text-neutral-300 leading-relaxed">
              Die Zusammenarbeit erfolgt aktuell noch über das alte Kundenportal.
              <br />
              Mehr dazu erfährst du in deinem Kennenlerngespräch.
            </p>
          </div>

          {/* CTA Button */}
          <motion.a
            href="https://tidycal.com/davidkosma/20-minute-meeting-m4ee56v"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-neutral-100 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Jetzt Kennenlerngespräch buchen
          </motion.a>

          {/* Small Trust Text */}
          <p className="mt-6 text-sm text-neutral-500">
            Kostenlos • 20 Minuten • Unverbindlich
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasReferralCode, setHasReferralCode] = useState(false);

  // Show "Coming Soon" in Production
  if (isProduction) {
    return <ComingSoonScreen />;
  }

  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
      setHasReferralCode(true);
      console.log('[Login] Referral code stored:', refCode);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('firstname, lastname, onboarding_completed_at')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error checking profile:', error);
            router.replace('/welcome');
            return;
          }

          if (!data?.firstname || !data?.lastname) {
            router.replace('/welcome');
          } else {
            router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Profile check failed:', err);
          router.replace('/welcome');
        }
      }
    };

    checkUserProfile();
  }, [user, router, supabase]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Google sign in failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError('');
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
      console.error('Email sign in failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError('');
      await signUpWithEmail(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      console.error('Email sign up failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4 mx-auto"></div>
          <p className="text-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {hasReferralCode && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 text-sm">
            🎉 Referral code applied! You&apos;ll get special benefits after signing up.
          </div>
        )}
        
        <LoginForm
          onGoogleSignIn={handleGoogleSignIn}
          onEmailSignIn={handleEmailSignIn}
          onEmailSignUp={handleEmailSignUp}
          error={error}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
