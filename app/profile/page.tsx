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
  const { subscription, currentSubscription, isLoading: isLoadingSubscription, syncWithStripe, fetchSubscription } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isReactivating] = useState(false);
  const [toast, setToast] = useState<{message: string, type: "success" | "error"} | null>(null);
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
        setToast({message: 'Abonnement erfolgreich gekündigt!', type: 'success'});
        await fetchSubscription();
        setIsCancelModalOpen(false);
        setTimeout(() => {
          setToast(null);
          window.location.reload();
        }, 2000);        setIsCancelModalOpen(false);
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
        setToast({message: 'Abonnement erfolgreich gekündigt!', type: 'success'});
        await fetchSubscription();
        setIsCancelModalOpen(false);
        setTimeout(() => {
          setToast(null);
          window.location.reload();
        }, 2000);      } else {
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