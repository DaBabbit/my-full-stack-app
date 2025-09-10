'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AccountManagement } from '@/components/AccountManagement';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { StripeBuyButton } from '@/components/StripeBuyButton';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  CreditCard, 
  Calendar,
  User,
  Settings,
  Crown,
  ExternalLink,
  ArrowRight,
  Lock
} from 'lucide-react';

function ProfileContent() {
  const { user } = useAuth();
  const { subscription, isLoading: isLoadingSubscription, syncWithStripe, fetchSubscription } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInTrial, trialEndTime } = useTrialStatus();

  // Check if user has active subscription (including trial)
  const hasActiveSubscription = subscription && 
    ['active', 'trialing'].includes(subscription.status) && 
    new Date(subscription.current_period_end) > new Date();

  // Show payment success message if redirected from successful payment
  useEffect(() => {
    if (paymentStatus === 'success') {
      console.log('Payment successful!');
    }
  }, [paymentStatus]);

  // Add error handling for subscription sync
  useEffect(() => {
    if (subscription?.stripe_subscription_id) {
      try {
        syncWithStripe(subscription.stripe_subscription_id);
        console.log('Subscription synced with Stripe successfully');
      } catch (err: unknown) {
        console.error('Error syncing with Stripe:', err);
        setError('Unable to load subscription details');
      }
    }
  }, [syncWithStripe, subscription?.stripe_subscription_id]);

  // Add loading timeout with auto-refresh
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoadingSubscription) {
        console.log('Subscription loading timeout, refreshing...');
        fetchSubscription();
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoadingSubscription, fetchSubscription]);

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    setIsCancelling(true);
    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        await fetchSubscription();
        setIsCancelModalOpen(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Cancel subscription error:', err);
      setError('Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        await fetchSubscription();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reactivate subscription');
      }
    } catch (err) {
      console.error('Reactivate subscription error:', err);
      setError('Failed to reactivate subscription');
    }
  };

  if (!user) {
    router.push('/login');
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-black pt-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile & Settings</h1>
          <p className="text-neutral-400">Verwalte dein Konto und deine Abonnement-Einstellungen</p>
        </div>

        {/* Payment Success Banner */}
        {paymentStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-green-500/10 backdrop-blur-md rounded-3xl border border-green-500/20"
          >
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-400 mr-3" />
              <p className="text-green-400 font-medium">
                🎉 Vielen Dank für dein Abonnement! Die Zahlung war erfolgreich.
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Content Planer & Account */}
          <div className="lg:col-span-2 space-y-8">
            {/* Content-Planer Section */}
            {hasActiveSubscription ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-white rounded-2xl mr-4">
                      <Settings className="w-8 h-8 text-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">
                        🎬 Content-Planer
                      </h3>
                      <p className="text-neutral-400">
                        Verwalte deine Videos und Content-Planung
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-3xl transition-all duration-300 flex items-center space-x-2 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    <span>Zum Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700"
              >
                <div className="text-center py-8">
                  <div className="p-4 bg-neutral-800 rounded-2xl w-fit mx-auto mb-4">
                    <Lock className="w-12 h-12 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Content-Planer gesperrt
                  </h3>
                  <p className="text-neutral-400 mb-6">
                    Du benötigst ein aktives Abonnement, um auf den Content-Planer zuzugreifen.
                  </p>
                  <button
                    onClick={() => document.getElementById('subscription-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="px-6 py-3 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-3xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    Abonnement abschließen
                  </button>
                </div>
              </motion.div>
            )}

            {/* Account Management */}
            <AccountManagement />
          </div>

          {/* Right Column - Subscription Status */}
          <div className="space-y-8">
            {/* Subscription Status Card */}
            <motion.div
              id="subscription-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700"
            >
              <div className="flex items-center mb-4">
                <Crown className="w-6 h-6 text-white mr-3" />
                <h2 className="text-xl font-semibold text-white">Abonnement Status</h2>
              </div>

              {error ? (
                <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                  <p className="text-red-400">{error}</p>
                </div>
              ) : isLoadingSubscription ? (
                <div className="flex items-center justify-center py-8">
                  <span className="loading loading-ring loading-md text-white"></span>
                  <span className="ml-3 text-neutral-400">Loading...</span>
                </div>
              ) : subscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-2xl">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        subscription.status === 'active' ? 'bg-green-400' : 
                        subscription.status === 'canceled' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <div>
                        <p className="text-white font-medium">
                          Status: <span className="capitalize">{subscription.status}</span>
                        </p>
                        <p className="text-sm text-neutral-400">
                          Plan: Premium
                        </p>
                      </div>
                    </div>
                    {subscription.status === 'active' && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                  </div>

                  {subscription.current_period_end && (
                    <div className="flex items-center p-4 bg-neutral-800/50 rounded-2xl">
                      <Calendar className="w-5 h-5 text-neutral-400 mr-3" />
                      <div>
                        <p className="text-white font-medium">Nächste Abrechnung</p>
                        <p className="text-sm text-neutral-400">
                          {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subscription Actions */}
                  <div className="space-y-3">
                    {subscription.status === 'active' && (
                      <button
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all duration-300 border border-red-500/20 hover:border-red-500/40"
                      >
                        Abonnement kündigen
                      </button>
                    )}

                    {subscription.status === 'canceled' && (
                      <button
                        onClick={handleReactivateSubscription}
                        className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-2xl transition-all duration-300 border border-green-500/20 hover:border-green-500/40"
                      >
                        Abonnement reaktivieren
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Trial Status */}
                  {isInTrial && trialEndTime ? (
                    <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                        <p className="text-yellow-400 font-medium">Testversion läuft</p>
                      </div>
                      <p className="text-sm text-neutral-400">
                        Endet am {new Date(trialEndTime).toLocaleDateString('de-DE')}
                      </p>
                      <p className="text-sm text-neutral-300 mt-2">
                        Abonniere jetzt, um nach dem Ende der Testversion weiterhin Zugriff zu haben.
                      </p>
                    </div>
                  ) : trialEndTime ? (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300 cursor-pointer"
                    >
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                        <p className="text-red-400 font-medium">Testversion beendet</p>
                      </div>
                      <p className="text-sm text-neutral-400">
                        Testversion endete am {new Date(trialEndTime).toLocaleDateString('de-DE')}
                      </p>
                      <p className="text-sm text-red-300 mt-2">
                        Abonniere jetzt, um wieder Zugriff auf alle Features zu erhalten.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="p-4 bg-neutral-800/50 rounded-2xl">
                      <p className="text-neutral-400">
                        Abonniere, um Zugriff auf alle Premium-Features zu erhalten.
                      </p>
                    </div>
                  )}

                  {/* Stripe Buy Button */}
                  <div className="text-center">
                    <StripeBuyButton
                      buyButtonId={process.env.NEXT_PUBLIC_STRIPE_BUTTON_ID || ''}
                      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-neutral-400 mr-3" />
                    <span className="text-white">Dashboard</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                </button>

                <button
                  onClick={() => router.push('/dashboard/videos')}
                  className="w-full flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-700/50 rounded-2xl transition-colors"
                >
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-neutral-400 mr-3" />
                    <span className="text-white">Videos</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700"
          >
            <h3 className="text-xl font-semibold mb-4 text-white">Abonnement kündigen?</h3>
            <p className="text-neutral-400 mb-6">
              Du behältst Zugriff bis zum Ende deiner Abrechnungsperiode am {new Date(subscription?.current_period_end || '').toLocaleDateString('de-DE')}. Es werden keine Rückerstattungen gewährt.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                disabled={isCancelling}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-300 border border-red-500/20 hover:border-red-500/40 disabled:opacity-50"
              >
                {isCancelling ? 'Wird gekündigt...' : 'Kündigen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">Fehler beim Laden der Profile-Seite.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      }
    >
      <Suspense fallback={<LoadingSpinner />}>
        <ProfileContent />
      </Suspense>
    </ErrorBoundary>
  );
}