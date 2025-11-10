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
    if (refCode) {
      // Store referral code in localStorage for later use during signup
      localStorage.setItem('referral_code', refCode);
      console.log('[SignUp] Referral code stored:', refCode);
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

  const handleSubmit = async (email: string, password: string, isSignUp: boolean) => {
    setError('');
    setIsLoading(true);

    try {
      // Only allow signup on this page
      const { data, error } = await signUpWithEmail(email, password);
      if (error) throw error;
      
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

