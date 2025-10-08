'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, supabase } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      if (isSignUp) {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) throw error;
        
        // Check if the user needs to verify their email
        if (data?.user && !data.user.email_confirmed_at) {
          router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        
        // New users always go to welcome screen
        router.replace('/welcome');
      } else {
        await signInWithEmail(email, password);
        // Existing users: check will be done in useEffect
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Authentication failed');
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
        {/* <h1 className="text-4xl font-bold text-center mb-8 text-primary dark:text-white">
          NextTemp
        </h1> */}
        <LoginForm
          onSubmit={handleSubmit}
          onGoogleSignIn={signInWithGoogle}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
} 