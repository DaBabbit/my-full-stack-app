'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

function CallbackContent() {
  const { supabase } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      console.log('[Auth Callback] Processing code:', code ? 'YES' : 'NO');

      if (code) {
        try {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          console.log('[Auth Callback] Exchange result:', {
            hasUser: !!data?.user,
            hasSession: !!data?.session,
            error: error?.message
          });

          if (error) {
            console.error('[Auth Callback] Error:', error);
            router.replace('/login?error=auth-failed');
            return;
          }

          if (data?.user) {
            // Check if user has completed onboarding
            const { data: userData } = await supabase
              .from('users')
              .select('firstname, lastname')
              .eq('id', data.user.id)
              .single();

            console.log('[Auth Callback] User data:', userData);

            // Redirect based on onboarding status
            if (!userData?.firstname || !userData?.lastname) {
              console.log('[Auth Callback] → /welcome (no name)');
              router.replace('/welcome');
            } else {
              console.log('[Auth Callback] → /dashboard (has name)');
              router.replace('/dashboard');
            }
          }
        } catch (err) {
          console.error('[Auth Callback] Exception:', err);
          router.replace('/login?error=auth-failed');
        }
      } else {
        console.log('[Auth Callback] No code, redirecting to login');
        router.replace('/login');
      }
    };

    handleCallback();
  }, [searchParams, supabase, router]);

  return <LoadingSpinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CallbackContent />
    </Suspense>
  );
}

