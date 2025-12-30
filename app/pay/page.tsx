'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { InvoiceNinjaCheckout } from '@/components/InvoiceNinjaCheckout';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';

export default function PaymentPage() {
  const { subscription, isLoading, error } = useSubscription();
  const router = useRouter();

  // Redirect if already subscribed
  useEffect(() => {
    if ((subscription?.status === 'active' || subscription?.status === 'trialing') && !subscription.cancel_at_period_end) {
      const timer = setTimeout(() => {
        router.push('/profile');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [subscription, router]);

  // Check if user can subscribe
  const canSubscribe = !isLoading && 
    (!subscription || 
    (subscription.status === 'canceled' && !subscription.cancel_at_period_end));

  // Add error handling
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <h1 className="text-xl md:text-2xl font-bold mb-4 text-center text-white">Error Loading Subscription</h1>
        <p className="text-neutral-400 mb-4 text-center">
          Unable to load subscription information. Please try again later.
        </p>
        <button
          onClick={() => router.push('/pay')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!canSubscribe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
        <h1 className="text-xl md:text-2xl font-bold mb-4 text-center text-white">Subscription Not Available</h1>
        <p className="text-neutral-400 mb-4 text-center">
          You already have an active or pending subscription.
        </p>
        <button
          onClick={() => router.push('/profile')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          View Subscription
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-6 text-center text-white">Complete Your Purchase</h1>
      
      <SubscriptionStatus />

      <div className="w-full max-w-md px-4 mt-6">
        <InvoiceNinjaCheckout />
      </div>
    </div>
  );
}





