'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';

export default function SignUpPage() {
  const { user, signInWithGoogle, signUpWithEmail, supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    console.log('[SignUp] URL params ref code:', refCode);
    
    if (refCode) {
      // Store referral code in localStorage for later use during signup
      localStorage.setItem('referral_code', refCode);
      console.log('[SignUp] Referral code stored in localStorage:', refCode);
      
      // Verify it was stored
      const stored = localStorage.getItem('referral_code');
      console.log('[SignUp] Verification - localStorage now contains:', stored);
    } else {
      console.log('[SignUp] No referral code in URL');
    }
  }, [searchParams]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (user) {
        try {
          // Check if user has completed onboarding
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

          // If user has no name, redirect to welcome
          if (!data?.firstname || !data?.lastname) {
            router.replace('/welcome');
          } else {
            router.replace('/dashboard');
          }
        } catch (err) {
          console.error('Error:', err);
          router.replace('/welcome');
        }
      } else {
        setIsLoading(false);
      }
    };

    checkUserProfile();
  }, [user, router, supabase]);

  const handleSubmit = async (email: string, password: string) => {
    setError('');
    setIsLoading(true);

    try {
      // Only allow signup on this page
      const { data, error } = await signUpWithEmail(email, password);
      if (error) throw error;
      
      // Store referral code in database for later claiming (after email verification)
      if (data?.user) {
        const referralCode = localStorage.getItem('referral_code');
        console.log('[SignUp] After signup, referral code from localStorage:', referralCode);
        
        if (referralCode) {
          console.log('[SignUp] Storing referral code in DB for user:', data.user.id);
          
          try {
            // Use API route with service role to bypass RLS
            const response = await fetch('/api/users/pending-referral', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: data.user.id,
                referralCode: referralCode
              })
            });

            const result = await response.json();
            console.log('[SignUp] API response:', result);

            if (response.ok && result.success) {
              console.log('[SignUp] Successfully stored referral code in DB');
              // Clean up localStorage - code is now in database
              localStorage.removeItem('referral_code');
              console.log('[SignUp] Cleaned up localStorage');
            } else {
              console.error('[SignUp] Failed to store referral code via API:', result.error);
              // Keep in localStorage as fallback
            }
          } catch (apiError) {
            console.error('[SignUp] Error calling API:', apiError);
            // Keep in localStorage as fallback
          }
        } else {
          console.log('[SignUp] No referral code to store');
        }
      }
      
      // Check if the user needs to verify their email
      if (data?.user && !data.user.email_confirmed_at) {
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      
      // New users always go to welcome screen
      router.replace('/welcome');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registrierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 pt-20">
      <div className="w-full max-w-md">
        <LoginForm
          onSubmit={handleSubmit}
          onGoogleSignIn={signInWithGoogle}
          isLoading={isLoading}
          error={error}
          defaultToSignUp={true}
          hideToggle={true}
        />
      </div>
    </div>
  );
}

