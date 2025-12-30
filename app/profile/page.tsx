'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AccountManagement } from '@/components/AccountManagement';
import TeamManagement from '@/components/TeamManagement';
import IncomingInvitations from '@/components/IncomingInvitations';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { InvoiceNinjaCheckout } from '@/components/InvoiceNinjaCheckout';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  CreditCard, 
  Calendar,
  Settings,
  Crown,
  ExternalLink,
  ArrowRight,
  Lock,
  FileText,
  Users,
  Share2
} from 'lucide-react';
import { ToastContainer, ToastProps } from '@/components/Toast';

function ProfileContent() {
  const { user, supabase } = useAuth();
  const { subscription, currentSubscription, isLoading: isLoadingSubscription, fetchSubscription } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInTrial, trialEndTime } = useTrialStatus();
  const [referralLink, setReferralLink] = useState<string>('');
  const [isGeneratingReferral, setIsGeneratingReferral] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [hasRewardedReferralAsReferrer, setHasRewardedReferralAsReferrer] = useState(false);

  // Toast helpers
  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  }, [removeToast]);

  // Check if user has active subscription (including trial)
  // Use currentSubscription from Stripe if available, otherwise fall back to subscription from Supabase
  const hasActiveSubscription = React.useMemo(() => {
    // Check currentSubscription (most recent, including canceled)
    const fromStripe = currentSubscription && 
      ['active', 'trialing', 'past_due'].includes(currentSubscription.status);
    
    // Check subscription (only active ones)
    const fromSupabase = subscription && 
      ['active', 'trialing', 'past_due'].includes(subscription.status);
    
    // If subscription is canceled but still in current period, consider it active
    const isCanceledButActive = currentSubscription && 
      currentSubscription.status === 'active' &&
      currentSubscription.cancel_at_period_end === true &&
      currentSubscription.current_period_end &&
      new Date(currentSubscription.current_period_end) > new Date();
    
    const result = fromStripe || fromSupabase || isCanceledButActive;
    
    console.log('[Profile] hasActiveSubscription check:', {
      fromStripe,
      fromSupabase,
      isCanceledButActive,
      currentSubscriptionStatus: currentSubscription?.status,
      subscriptionStatus: subscription?.status,
      cancelAtPeriodEnd: currentSubscription?.cancel_at_period_end,
      periodEnd: currentSubscription?.current_period_end,
      result
    });
    
    return result;
  }, [currentSubscription, subscription]);

  // Show payment success message if redirected from successful payment
  useEffect(() => {
    if (paymentStatus === 'success') {
      console.log('Payment successful!');
    }
  }, [paymentStatus]);

  // Sync with Stripe on mount to get latest subscription data
  useEffect(() => {
    const syncSubscription = async () => {
      // Get subscription ID from either currentSubscription or subscription
      const subId = currentSubscription?.stripe_subscription_id || subscription?.stripe_subscription_id;
      
      if (subId) {
        try {
          console.log('[Profile] Syncing subscription with Stripe:', subId);
          const response = await fetch('/api/stripe/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionId: subId }),
          });

          if (response.ok) {
            console.log('[Profile] Subscription synced successfully');
            // Refresh subscription data after sync
            await fetchSubscription(true);
          } else {
            console.error('[Profile] Sync failed:', await response.text());
          }
        } catch (err: unknown) {
          console.error('[Profile] Error syncing with Stripe:', err);
        }
      }
    };

    syncSubscription();
  }, [currentSubscription?.stripe_subscription_id, subscription?.stripe_subscription_id, fetchSubscription]);

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

  // Auto-Sync alle 30 Sekunden
  useEffect(() => {
    if (!user || !subscription) return;
    
    const autoSync = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const response = await fetch('/api/stripe/auto-sync', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Profile] Auto-sync successful:', data);
          // Trigger re-fetch of subscription
          fetchSubscription();
        }
      } catch (error) {
        console.error('[Profile] Auto-sync error:', error);
      }
    };
    
    // Initial sync after 5 seconds
    const initialTimeout = setTimeout(autoSync, 5000);
    
    // Then every 30 seconds
    const interval = setInterval(autoSync, 30000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, subscription, supabase, fetchSubscription]);

  // Check if user has rewarded referrals as referrer
  useEffect(() => {
    const checkRewardedReferrals = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_user_id', user.id)
        .eq('status', 'rewarded')
        .limit(1);
      
      setHasRewardedReferralAsReferrer((data && data.length > 0) || false);
    };
    
    checkRewardedReferrals();
  }, [user, supabase]);

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
        addToast({
          type: 'success',
          title: 'Erfolgreich',
          message: 'Abonnement erfolgreich gekündigt!'
        });
        await fetchSubscription();
        setIsCancelModalOpen(false);
        // Elegant reload after a short delay to show the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
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
    // Use currentSubscription which is ALWAYS set (regardless of status)
    if (!currentSubscription?.stripe_subscription_id) {
      console.error('[Reactivate] No subscription ID found');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Keine Abonnement-ID gefunden'
      });
      return;
    }
    
    console.log('[Reactivate] Using subscription ID:', currentSubscription.stripe_subscription_id);
    
    setIsReactivating(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: currentSubscription.stripe_subscription_id }),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Erfolgreich',
          message: 'Abonnement erfolgreich wiederhergestellt!'
        });
        await fetchSubscription();
        setIsReactivateModalOpen(false);
        // Elegant reload after a short delay to show the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reactivate subscription');
        setIsReactivateModalOpen(false);
        addToast({
          type: 'error',
          title: 'Fehler',
          message: data.error || 'Fehler beim Wiederherstellen des Abonnements'
        });
      }
    } catch (err) {
      console.error('Reactivate subscription error:', err);
      setError('Failed to reactivate subscription');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Fehler beim Wiederherstellen des Abonnements'
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const generateReferralLink = async () => {
    if (!user?.id) return;
    
    setIsGeneratingReferral(true);
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Keine aktive Session'
        });
        return;
      }

      const response = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReferralLink(data.referralLink);
        addToast({
          type: 'success',
          title: 'Erfolgreich',
          message: 'Empfehlungslink erstellt!'
        });
      } else {
        const errorData = await response.json();
        console.error('[Profile] Referral generation failed:', errorData);
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Fehler beim Erstellen des Links'
        });
      }
    } catch (err: unknown) {
      console.error('[Profile] Referral generation error:', err);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Netzwerkfehler'
      });
    } finally {
      setIsGeneratingReferral(false);
    }
  };

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setReferralCopied(true);
      addToast({
        type: 'success',
        title: 'Kopiert',
        message: 'Link kopiert!',
        duration: 2000
      });
      setTimeout(() => setReferralCopied(false), 2000);
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
          <h1 className="text-3xl font-bold text-white mb-2">Profileinstellungen</h1>
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

            {/* Team Management - Only for users with active subscription */}
            {hasActiveSubscription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <TeamManagement />
              </motion.div>
            )}

            {/* Incoming Invitations - For all users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <IncomingInvitations />
            </motion.div>
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
              ) : (currentSubscription && currentSubscription.status) ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-2xl">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        currentSubscription.status === 'active' && !currentSubscription.cancel_at_period_end ? 'bg-green-400' : 
                        currentSubscription.status === 'canceled' || currentSubscription.cancel_at_period_end ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <div>
                        <p className="text-white font-medium">
                          Status: <span className={`${
                            currentSubscription.cancel_at_period_end ? 'text-red-400' : 
                            currentSubscription.status === 'active' ? '' : 
                            'text-neutral-400'
                          }`}>
                            {currentSubscription.cancel_at_period_end 
                              ? 'Gekündigt' 
                              : currentSubscription.status === 'active' 
                                ? 'Aktiv' 
                                : 'Inaktiv'}
                          </span>
                        </p>
                        <p className="text-sm text-neutral-400">
                          Plan: Premium
                        </p>
                        {currentSubscription.cancel_at_period_end && (
                          <p className="text-xs text-red-400 mt-1">
                            Läuft bis {new Date(currentSubscription.current_period_end).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                    {currentSubscription.status === 'active' && !currentSubscription.cancel_at_period_end && (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    )}
                    {currentSubscription.cancel_at_period_end && (
                      <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                    )}
                  </div>

                  {currentSubscription?.current_period_end && (
                    <div className="flex items-center p-4 bg-neutral-800/50 rounded-2xl">
                      <Calendar className="w-5 h-5 text-neutral-400 mr-3" />
                      <div>
                        <p className="text-white font-medium">{currentSubscription?.cancel_at_period_end ? "Ende Abrechnungszeitraum" : "Nächste Abrechnung"}</p>
                        <p className="text-sm text-neutral-400">
                          {new Date(currentSubscription.current_period_end).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subscription Actions */}
                  <div className="space-y-3">
                    {/* Abo verwalten - nur wenn aktiv und nicht gekündigt */}
                    {currentSubscription.status === 'active' && !currentSubscription.cancel_at_period_end && (
                      <button
                        onClick={() => router.push('/profile/manage-subscription')}
                        className="w-full p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-neutral-600 flex items-center justify-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Abo verwalten
                      </button>
                    )}

                    {/* Abo wiederherstellen - bei gekündigt (cancel_at_period_end) ODER canceled Status */}
                    {(currentSubscription.cancel_at_period_end || currentSubscription.status === 'canceled') && (
                      <button
                        onClick={() => setIsReactivateModalOpen(true)}
                        className="w-full p-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-2xl transition-all duration-300 border border-green-500/20 hover:border-green-500/40 flex items-center justify-center gap-2 font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Abo wiederherstellen
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

                  {/* Invoice Ninja Checkout */}
                  <div className="text-center">
                    <InvoiceNinjaCheckout />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Social Media Accounts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl mr-3">
                    <Share2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Social Media</h3>
                </div>
                
                <p className="text-neutral-400 mb-4">
                  Verbinde deine Social Media Accounts für automatisches Video-Publishing
                </p>
                <button
                  onClick={() => router.push('/profile/social-media')}
                  className="w-full p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-neutral-600 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Accounts verwalten
                </button>
              </motion.div>

            {/* Rechnungen */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-neutral-800 rounded-xl mr-3">
                    <FileText className="w-6 h-6 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Rechnungen</h3>
                </div>
              
              {hasActiveSubscription ? (
                <>
                <p className="text-neutral-400 mb-4">
                  Sehe alle deine Rechnungen und Zahlungsbelege ein
                </p>
                <button
                  onClick={() => router.push('/profile/invoices')}
                  className="w-full p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-neutral-600 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Rechnungen ansehen
                </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                    <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Schließe ein Abo ab, um deine Rechnungen und Zahlungsbelege einzusehen
                    </p>
                  </div>
                  <button
                    disabled
                    className="w-full p-3 bg-neutral-800/50 text-neutral-500 rounded-2xl border border-neutral-700 flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    Rechnungen ansehen
                  </button>
                </>
              )}
              </motion.div>

            {/* Empfehlungs-Feature */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-md rounded-3xl p-6 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl mr-3">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Freund empfehlen - 250€ Rabatt sichern</h3>
                </div>
                <p className="text-neutral-300 mb-4">
                  Empfehle einen Freund und erhalte <span className="text-blue-400 font-semibold">250€ Rabatt</span> auf deine nächste Rechnung, wenn dein Freund sein erstes Abo bezahlt.
                </p>
                
              {hasActiveSubscription ? (
                <>
                {!referralLink ? (
                  <button
                    onClick={generateReferralLink}
                    disabled={isGeneratingReferral}
                    className="w-full p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-2xl transition-all duration-300 font-medium flex items-center justify-center gap-2"
                  >
                    {isGeneratingReferral ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        <span>Wird erstellt...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Empfehlungslink erstellen</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={referralLink}
                        readOnly
                        className="flex-1 p-3 bg-neutral-800/50 text-neutral-300 rounded-2xl border border-neutral-700 font-mono text-sm"
                      />
                      <button
                        onClick={copyReferralLink}
                        className={`p-3 rounded-2xl transition-all duration-300 ${
                          referralCopied 
                            ? 'bg-green-500 text-white' 
                            : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                        }`}
                      >
                        {referralCopied ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-neutral-400">
                      Teile diesen Link mit Freunden. Du erhältst 250€ Rabatt, sobald sie ihr erstes Abo bezahlt haben.
                    </p>
                  </div>
                )}

                  {/* Warning: Canceled subscription with rewarded referral */}
                  {currentSubscription?.cancel_at_period_end && hasRewardedReferralAsReferrer && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl flex items-start gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      <div className="flex-1">
                        <p className="text-red-300 font-semibold text-sm mb-1">
                          ⚠️ Wichtig: Dein Empfehlungsrabatt verfällt!
                        </p>
                        <p className="text-red-200/90 text-xs leading-relaxed">
                          Dein Abo wurde gekündigt. Wenn du es nicht bis zum{' '}
                          <span className="font-bold">
                            {currentSubscription?.current_period_end 
                              ? new Date(currentSubscription.current_period_end).toLocaleDateString('de-DE')
                              : 'nächsten Abrechnungsdatum'}
                          </span>{' '}
                          wiederherstellst, verfällt dein 250€ Rabatt und wird automatisch zurückgenommen.
                        </p>
                        <button
                          onClick={() => router.push('/profile/manage-subscription')}
                          className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-all duration-300"
                        >
                          Abo jetzt wiederherstellen
                        </button>
                      </div>
              </motion.div>
            )}
                </>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
                  <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-300">
                    Schließe ein Abo ab, um Empfehlungslinks zu erstellen und Rabatte zu verdienen
                  </p>
                </div>
              )}
              
              {/* Button zu Geworbene Freunde Seite - Immer sichtbar */}
              <button
                onClick={() => router.push('/profile/referrals')}
                className="w-full mt-3 p-3 bg-neutral-800/50 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 font-medium flex items-center justify-center gap-2 border border-neutral-700 hover:border-neutral-600"
              >
                <Users className="w-4 h-4" />
                <span>Geworbene Freunde anzeigen</span>
              </button>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Reactivate Confirmation Modal */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700"
          >
            <h3 className="text-xl font-semibold mb-4 text-white">Abonnement wiederherstellen?</h3>
            <p className="text-neutral-400 mb-6">
              Ihr Abonnement wird sofort wiederhergestellt und die Abrechnung läuft ab dem {new Date().toLocaleDateString('de-DE')} weiter. 
              Die nächste Zahlung erfolgt am {new Date(currentSubscription?.current_period_end || '').toLocaleDateString('de-DE')}.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsReactivateModalOpen(false)}
                className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                disabled={isReactivating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
                className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all duration-300 border border-green-500/20 hover:border-green-500/40 disabled:opacity-50"
              >
                {isReactivating ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reactivate Confirmation Modal */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700"
          >
            <h3 className="text-xl font-semibold mb-4 text-white">Abonnement wiederherstellen?</h3>
            <p className="text-neutral-400 mb-6">
              Ihr Abonnement wird sofort wiederhergestellt und die Abrechnung läuft ab dem {new Date().toLocaleDateString('de-DE')} weiter. 
              Die nächste Zahlung erfolgt am {new Date(currentSubscription?.current_period_end || '').toLocaleDateString('de-DE')}.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsReactivateModalOpen(false)}
                className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                disabled={isReactivating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
                className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all duration-300 border border-green-500/20 hover:border-green-500/40 disabled:opacity-50"
              >
                {isReactivating ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
              Du behältst Zugriff bis zum Ende deiner Abrechnungsperiode am {new Date(currentSubscription?.current_period_end || '').toLocaleDateString('de-DE')}. Es werden keine Rückerstattungen gewährt.
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
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
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