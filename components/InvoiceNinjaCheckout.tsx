'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, Loader2 } from 'lucide-react';

interface InvoiceNinjaCheckoutProps {
  className?: string;
}

export function InvoiceNinjaCheckout({ className }: InvoiceNinjaCheckoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Erstelle Subscription via API
      const response = await fetch('/api/invoice-ninja/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email?.split('@')[0],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      console.log('[InvoiceNinjaCheckout] Subscription created:', data);

      // 2. Redirect zu Invoice Ninja Client Portal
      if (data.clientPortalUrl) {
        window.location.href = data.clientPortalUrl;
      } else {
        throw new Error('No client portal URL returned');
      }
    } catch (err) {
      console.error('[InvoiceNinjaCheckout] Error:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={className}>
      <motion.button
        onClick={handleSubscribe}
        disabled={isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Erstelle Abo...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Jetzt abonnieren - 29,99€/Monat</span>
          </>
        )}
      </motion.button>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 text-center text-neutral-400 text-sm">
        <p>Nach dem Klick werden Sie zu Invoice Ninja weitergeleitet,</p>
        <p>um Ihr SEPA-Lastschriftmandat einzurichten.</p>
      </div>
    </div>
  );
} 

