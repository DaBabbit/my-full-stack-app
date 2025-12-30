'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook um zu prüfen ob ein User Referral-Guthaben hat
 * Zeigt ein Banner/Hinweis wenn Rabatt verfügbar ist
 */
export function useReferralCredit() {
  const { user, supabase } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['referral-credit', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          hasCredit: false,
          creditAmount: 0,
          referral: null,
        };
      }

      // Prüfe ob User durch Referral geworben wurde und Guthaben hat
      const { data: referral, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', user.id)
        .eq('status', 'completed')
        .eq('discount_applied', false)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[useReferralCredit] Error:', error);
        throw error;
      }

      if (!referral) {
        return {
          hasCredit: false,
          creditAmount: 0,
          referral: null,
        };
      }

      // Guthaben verfügbar
      return {
        hasCredit: true,
        creditAmount: referral.discount_amount / 100, // Von Cent zu Euro
        referral,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
    refetchOnWindowFocus: true,
  });

  const applyCredit = async (invoiceId?: string) => {
    if (!user?.id) return { success: false, error: 'No user' };

    try {
      const response = await fetch('/api/referrals/apply-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          invoiceId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply credit');
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('[useReferralCredit] Apply Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return {
    hasCredit: data?.hasCredit || false,
    creditAmount: data?.creditAmount || 0,
    referral: data?.referral || null,
    isLoading,
    applyCredit,
  };
}

