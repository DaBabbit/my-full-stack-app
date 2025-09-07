'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

function VerifyEmailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [countdown, setCountdown] = useState(60);

  // Redirect if user is already verified
  useEffect(() => {
    if (user?.email_confirmed_at) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleResendEmail = async () => {
    // Reset countdown
    setCountdown(60);
    // TODO: Implement resend verification email logic
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 border border-neutral-700">
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="text-3xl">📧</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              E-Mail überprüfen
            </h2>
            <p className="text-neutral-300 mb-8">
              Wir haben einen Bestätigungslink an{' '}
              <span className="font-medium text-white">{email}</span> gesendet
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center text-sm text-neutral-300">
              <p className="mb-4">Bitte überprüfen Sie Ihre E-Mail und klicken Sie auf den Bestätigungslink, um fortzufahren.</p>
              <p>
                E-Mail nicht erhalten? Sie können eine neue anfordern{' '}
                {countdown > 0 ? (
                  <span className="text-neutral-400">in {countdown} Sekunden</span>
                ) : (
                  <button
                    onClick={handleResendEmail}
                    className="text-white hover:text-neutral-300 underline"
                  >
                    jetzt
                  </button>
                )}
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                ← Zurück zur Anmeldung
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailContent />
    </Suspense>
  );
} 