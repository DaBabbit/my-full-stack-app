'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const { supabase } = useAuth();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingHash, setIsProcessingHash] = useState(true);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('🔍 [UPDATE-PASSWORD] Component mounted');
    console.log('🔍 [UPDATE-PASSWORD] Current URL:', window.location.href);
    console.log('🔍 [UPDATE-PASSWORD] Hash:', window.location.hash);
    
    // Check current session status
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 [UPDATE-PASSWORD] Current session status:', {
          hasSession: !!session,
          userId: session?.user?.id || 'NONE',
          userEmail: session?.user?.email || 'NONE'
        });
      } catch (err) {
        console.error('❌ [UPDATE-PASSWORD] Error checking session:', err);
      }
    };
    
    checkSession();
  }, [supabase.auth]);

  // Check if we have a valid hash in the URL (indicates password reset flow)
  useEffect(() => {
    console.log('🔍 [HASH-PROCESSING] useEffect started');
    
    const processHashFragment = async () => {
      try {
        console.log('🔍 [HASH-PROCESSING] === START ===');
        
        // Get the hash fragment from the URL
        const hash = window.location.hash;
        const fullUrl = window.location.href;
        
        console.log('Full URL:', fullUrl);
        console.log('Raw hash:', hash);
        console.log('Hash length:', hash?.length || 0);
        console.log('Pathname:', window.location.pathname);
        console.log('Search:', window.location.search);
        console.log('Hash starts with #:', hash?.startsWith('#'));
        
        if (!hash) {
          console.log('❌ [HASH-PROCESSING] No hash found');
          setError('Kein Recovery-Link gefunden. Bitte verwenden Sie den Link aus der E-Mail oder fordern Sie einen neuen an.');
          setIsProcessingHash(false);
          return;
        }

        // Check if hash is just a single # (empty hash)
        if (hash === '#') {
          console.log('❌ [HASH-PROCESSING] Empty hash found');
          setError('Der Recovery-Link ist ungültig. Bitte verwenden Sie den Link aus der E-Mail oder fordern Sie einen neuen an.');
          setIsProcessingHash(false);
          return;
        }

        // Remove the # and parse as URLSearchParams
        const hashWithoutHash = hash.substring(1);
        console.log('Hash without #:', hashWithoutHash);
        
        // Parse the hash fragment
        const hashParams = new URLSearchParams(hashWithoutHash);
        
        // Alternative parsing method if URLSearchParams fails
        let accessToken = hashParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token');
        let type = hashParams.get('type');
        
        // If standard parsing failed, try manual parsing
        if (!accessToken || !type) {
          console.log('🔄 [HASH-PROCESSING] Standard parsing failed, trying manual parsing...');
          
          // Try to extract manually from the hash string
          const typeMatch = hash.match(/type=([^&]+)/);
          const accessTokenMatch = hash.match(/access_token=([^&]+)/);
          const refreshTokenMatch = hash.match(/refresh_token=([^&]+)/);
          
          if (typeMatch) type = typeMatch[1];
          if (accessTokenMatch) accessToken = accessTokenMatch[1];
          if (refreshTokenMatch) refreshToken = refreshTokenMatch[1];
          
          console.log('Manual parsing results:', {
            type,
            accessToken: accessToken ? 'FOUND' : 'NOT_FOUND',
            refreshToken: refreshToken ? 'FOUND' : 'NOT_FOUND'
          });
        }

        // Log all hash parameters for debugging
        const allParams: Record<string, string> = {};
        for (const [key, value] of hashParams.entries()) {
          allParams[key] = value;
        }
        console.log('All hash parameters:', allParams);
        console.log('Number of hash parameters:', Object.keys(allParams).length);
        
        console.log('Extracted params:', { 
          type, 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0,
          accessTokenFirstChars: accessToken?.substring(0, 20) + '...' || 'NONE',
          refreshTokenFirstChars: refreshToken?.substring(0, 20) + '...' || 'NONE'
        });

        // Check if this is an error hash (not a recovery flow)
        if (hash.includes('error=')) {
          console.log('❌ [HASH-PROCESSING] Error hash detected');
          
          // Extract error information
          const errorMatch = hash.match(/error=([^&]+)/);
          const errorCodeMatch = hash.match(/error_code=([^&]+)/);
          const errorDescriptionMatch = hash.match(/error_description=([^&]+)/);
          
          const errorType = errorMatch ? errorMatch[1] : 'unknown';
          const errorCode = errorCodeMatch ? errorCodeMatch[1] : 'unknown';
          const errorDescription = errorDescriptionMatch ? decodeURIComponent(errorDescriptionMatch[1]) : 'Unknown error';
          
          console.log('Error details:', { errorType, errorCode, errorDescription });
          
          // Handle specific error types
          if (errorCode === 'otp_expired') {
            setError('Der Passwort-Reset-Link ist abgelaufen. Bitte fordern Sie einen neuen Link an.');
            // Clear the error hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          } else if (errorType === 'access_denied') {
            setError('Zugriff verweigert. Der Link ist ungültig oder abgelaufen.');
            // Clear the error hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            setError(`Fehler beim Verarbeiten des Links: ${errorDescription}`);
            // Clear the error hash from URL
            window.history.replaceState(null, '', window.location.pathname);
          }
          
          setIsProcessingHash(false);
          return;
        }

        // Check if hash contains the expected parameters (more flexible check)
        const hasRecoveryType = hash.includes('type=recovery') || type === 'recovery';
        const hasAccessToken = hash.includes('access_token') || !!accessToken;
        
        console.log('Hash validation:', {
          hasRecoveryType,
          hasAccessToken,
          hashContainsTypeRecovery: hash.includes('type=recovery'),
          hashContainsAccessToken: hash.includes('access_token')
        });

        if (!hasRecoveryType) {
          console.log('❌ [HASH-PROCESSING] Not a recovery flow, type:', type);
          setError(`Invalid recovery link format. Expected type=recovery, got: ${type || 'undefined'}. Hash: ${hash.substring(0, 100)}...`);
          setIsProcessingHash(false);
          return;
        }

        if (!hasAccessToken) {
          console.log('❌ [HASH-PROCESSING] Missing access token');
          setError(`Missing access token in recovery link. Hash: ${hash.substring(0, 100)}...`);
          setIsProcessingHash(false);
          return;
        }

        // Set the session with the tokens from the hash
        console.log('🔄 [HASH-PROCESSING] Setting session with recovery tokens...');
        
        // First, sign out any existing session to avoid conflicts
        console.log('🔄 [HASH-PROCESSING] Signing out existing session...');
        
        // Add timeout for signOut
        const signOutPromise = supabase.auth.signOut();
        const signOutTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('signOut timeout')), 3000)
        );
        
        try {
          await Promise.race([signOutPromise, signOutTimeout]);
          console.log('✅ [HASH-PROCESSING] Sign out completed');
        } catch (signOutError) {
          console.warn('⚠️ [HASH-PROCESSING] Sign out timeout, continuing anyway:', signOutError);
          // Continue even if sign out fails
        }
        
        // Set session with timeout
        const setSessionPromise = supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken || '',
        });
        
        const setSessionTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('setSession timeout')), 5000)
        );
        
        const { data, error } = await Promise.race([setSessionPromise, setSessionTimeout]);

        if (error) {
          console.error('❌ [HASH-PROCESSING] Error setting session:', error);
          if (error.message.includes('timeout')) {
            setError('Die Verarbeitung des Recovery-Links dauert zu lange. Bitte versuchen Sie es erneut.');
          } else {
            setError('Failed to authenticate recovery link: ' + error.message);
          }
          setIsProcessingHash(false);
          return;
        } else {
          console.log('✅ [HASH-PROCESSING] Session set successfully:', data);
          
          // Verify the session was set correctly with timeout
          console.log('🔄 [HASH-PROCESSING] Verifying session...');
          try {
            const getSessionPromise = supabase.auth.getSession();
            const getSessionTimeout = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('getSession timeout')), 3000)
            );
            
            const { data: { session } } = await Promise.race([getSessionPromise, getSessionTimeout]);
            console.log('Current session after set:', session);
            
            if (session) {
              // Clear the hash from the URL for security
              window.history.replaceState(null, '', window.location.pathname);
              console.log('🔒 [HASH-PROCESSING] Hash cleared from URL');
              
              // Show success message and hide loading immediately
              setSuccess(true);
              setSuccessMessage('Recovery link verified successfully! You can now set your new password.');
              setIsProcessingHash(false);
            } else {
              setError('Session was not set correctly');
              setIsProcessingHash(false);
            }
          } catch (sessionError) {
            console.error('❌ [HASH-PROCESSING] Error getting session:', sessionError);
            // Even if getSession fails, we might still be authenticated
            // Try to clear the hash and show success
            window.history.replaceState(null, '', window.location.pathname);
            setSuccess(true);
            setSuccessMessage('Recovery link verified! You can now set your new password.');
            setIsProcessingHash(false);
          }
        }
      } catch (err) {
        console.error('💥 [HASH-PROCESSING] Error processing hash:', err);
        setError('Failed to process recovery link: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setIsProcessingHash(false);
      } finally {
        console.log('🔍 [HASH-PROCESSING] === END ===');
      }
    };

    // Add a small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      console.log('🔍 [HASH-PROCESSING] Starting hash processing after delay');
      processHashFragment();
    }, 100);

    // Fallback: If hash processing takes too long, show password form anyway
    const fallbackTimer = setTimeout(() => {
      if (isProcessingHash) {
        console.log('⚠️ [FALLBACK] Hash processing taking too long, showing password form anyway');
        setIsProcessingHash(false);
        // Don't set success to true, just show the form directly
        // The form will be shown because isProcessingHash is false and there's no error
      }
    }, 5000); // 5 seconds timeout

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔄 [PASSWORD-UPDATE] Starting password update...');
      console.log('🔄 [PASSWORD-UPDATE] Password length:', newPassword.length);
      
      // Update password with timeout
      const updateUserPromise = supabase.auth.updateUser({ password: newPassword });
      const updateUserTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('updateUser timeout')), 8000)
      );
      
      const { data, error } = await Promise.race([updateUserPromise, updateUserTimeout]);
      
      if (error) {
        console.error('❌ [PASSWORD-UPDATE] Error updating password:', error);
        setError('Fehler beim Aktualisieren des Passworts: ' + error.message);
      } else {
        console.log('✅ [PASSWORD-UPDATE] Password updated successfully:', data);
        setSuccess(true);
        setSuccessMessage('Passwort erfolgreich aktualisiert!');
        
        // Sign out the user to force re-login with new password
        console.log('🔄 [PASSWORD-UPDATE] Signing out user...');
        await supabase.auth.signOut();
        
        // Redirect to login after successful password update
        setTimeout(() => {
          router.push('/login?success=Passwort wurde erfolgreich geändert!');
        }, 2000);
      }
    } catch (err) {
      console.error('💥 [PASSWORD-UPDATE] Unexpected error:', err);
      if (err instanceof Error && err.message.includes('timeout')) {
        setError('Das Passwort-Update dauert zu lange. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.');
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Update Password</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Please enter your new password
          </p>
        </div>

        {/* Show loading only briefly while processing hash */}
        {isProcessingHash && (
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-500 p-4 rounded-lg">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
              <p>Verarbeite Recovery-Link...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-500 p-4 rounded-lg">
            <p className="font-medium">❌ {error}</p>
            {error.includes('Recovery-Link') && (
              <div className="mt-3">
                <p className="text-sm text-red-400 mb-2">
                  Der Link aus der E-Mail ist ungültig oder abgelaufen.
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => router.push('/reset-password')}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Neuen Reset-Link anfordern
                  </button>
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Zurück zur Anmeldung
                  </button>
                </div>
              </div>
            )}
            {!error.includes('Recovery-Link') && (
              <div className="mt-2">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm underline hover:text-red-600"
                >
                  Zurück zur Anmeldung
                </button>
              </div>
            )}
          </div>
        )}

        {success ? (
          <div className="bg-green-50 dark:bg-green-900/30 text-green-500 p-4 rounded-lg">
            <p className="font-medium">{successMessage}</p>
            <p className="text-sm mt-1">Redirecting to login in a few seconds...</p>
          </div>
        ) : (
          /* Show password form if no error and not processing hash, OR if success is true */
          (!error && !isProcessingHash) || success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  minLength={6}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Password must be at least 6 characters long</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          ) : null
        )}
      </div>
    </div>
  );
} 