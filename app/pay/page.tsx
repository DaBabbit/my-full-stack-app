'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import PlanSelectionModal from '@/components/PlanSelectionModal';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentPage() {
  const { subscription, isLoading, error } = useSubscription();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

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

  const handlePlanSuccess = async () => {
    console.log('[PaymentPage] Payment success, refreshing subscription...');
    
    // Refresh subscription data
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });
    }
    
    // Show success message
    setTimeout(() => {
      router.push('/profile');
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <h1 className="text-xl md:text-2xl font-bold mb-6 text-center text-white">
        Wähle deinen Plan
      </h1>
      
      <SubscriptionStatus />

      <div className="w-full max-w-md px-4 mt-6">
        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 hover:scale-105"
        >
          Plan wählen
        </button>
        
        <p className="text-neutral-400 text-sm text-center mt-4">
          Sichere Zahlung über Invoice Ninja mit GoCardless SEPA Lastschrift
        </p>
      </div>

      <PlanSelectionModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSuccess={handlePlanSuccess}
      />
    </div>
  );
}





