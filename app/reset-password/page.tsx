'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

function ResetPasswordContent() {
  const { supabase, user } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(true);
  const [inputEmail, setInputEmail] = useState(email || '');

  // Automatically trigger reset password if email is present
  useEffect(() => {
    if (email && !success && !isLoading) {
      handleResetPassword();
    }
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetPassword = async (emailToUse?: string) => {
    const emailToReset = emailToUse || email || inputEmail;
    if (!emailToReset) return;
    
    setIsLoading(true);
    setError('');

    try {
      // If user is logged in, skip email validation
      if (user) {
        console.log('🔄 [RESET-PASSWORD] User is logged in, skipping email validation');
      } else {
        // First, check if the email exists by trying to sign in
        console.log('🔍 [RESET-PASSWORD] Checking if email exists:', emailToReset);
        
        // Try to sign in with a dummy password to check if user exists
        // This will fail with "Invalid login credentials" if user doesn't exist
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToReset,
          password: 'dummy-password-for-validation-only'
        });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials') || 
              signInError.message.includes('Email not confirmed') ||
              signInError.message.includes('Invalid email')) {
            console.log('❌ [RESET-PASSWORD] User does not exist:', signInError.message);
            setError('Diese E-Mail-Adresse ist nicht registriert. Bitte melden Sie sich zuerst an oder registrieren Sie sich.');
            setIsLoading(false);
            return;
          }
          // Other errors (like rate limiting) - proceed with reset
          console.log('⚠️ [RESET-PASSWORD] Sign-in check failed, proceeding:', signInError.message);
        } else {
          // User exists, sign out immediately
          await supabase.auth.signOut();
          console.log('✅ [RESET-PASSWORD] User exists, signed out');
        }
      }
      
      // Email exists, proceed with password reset
      console.log('🔄 [RESET-PASSWORD] Sending reset email to:', emailToReset);
      const { error } = await supabase.auth.resetPasswordForEmail(emailToReset, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      
      if (error) throw error;
      setSuccess(true);
      setShowEmailInput(false);
    } catch (error) {
      console.error('❌ [RESET-PASSWORD] Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewReset = () => {
    setSuccess(false);
    setError('');
    setShowEmailInput(true);
    setInputEmail('');
  };

  if (!email && !showEmailInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Invalid Request</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              No email address provided. Please try the reset password link again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Reset Password</h2>
          {user && (
            <p className="mt-2 text-green-600 dark:text-green-400">
              ✅ Sie sind eingeloggt als: {user.email}
            </p>
          )}
          {!user && showEmailInput && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Geben Sie Ihre E-Mail-Adresse ein, um einen Passwort-Reset-Link zu erhalten.
            </p>
          )}
          {email && !showEmailInput && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Sending reset link to: <span className="font-medium">{email}</span>
            </p>
          )}
        </div>

        {/* Email Input Form */}
        {showEmailInput && (
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                placeholder="ihre.email@beispiel.de"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => handleResetPassword()}
              disabled={!inputEmail || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sende Reset-Link...' : 'Passwort zurücksetzen'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-4 rounded-lg">
            <p className="font-medium">❌ {error}</p>
            {error.includes('nicht registriert') && (
              <div className="mt-3">
                <p className="text-sm text-red-400 mb-2">
                  Diese E-Mail-Adresse existiert nicht in unserem System.
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => window.location.href = '/login'}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Zurück zur Anmeldung
                  </button>
                  <button
                    onClick={() => window.location.href = '/signup'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Registrieren
                  </button>
                </div>
              </div>
            )}
            {!error.includes('nicht registriert') && (
              <button
                onClick={() => handleResetPassword()}
                className="ml-2 underline hover:text-red-600"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-500 p-4 rounded-lg">
            <p className="font-medium">✅ Reset-Link wurde gesendet!</p>
            <p className="text-sm mt-1">
              Bitte überprüfen Sie Ihren E-Mail-Eingang und klicken Sie auf den Link.
            </p>
            <div className="mt-3">
              <button
                onClick={handleNewReset}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
              >
                Neuen Reset-Link anfordern
              </button>
            </div>
          </div>
        ) : (
          !showEmailInput && (
            <div className="text-center text-gray-600 dark:text-gray-300">
              {isLoading ? 'Sende Reset-Link...' : 'Verarbeite Ihre Anfrage...'}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  );
} 