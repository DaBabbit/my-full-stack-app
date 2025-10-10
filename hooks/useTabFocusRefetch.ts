'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook der bei Tab-Fokus explizit ALLE Video-Queries refetcht
 * Dies ist eine zusätzliche Absicherung neben refetchOnWindowFocus
 */
export function useTabFocusRefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[useTabFocusRefetch] 🔄 Tab is now visible - AGGRESSIVE refetching all queries...');
        
        // 🔥 AGGRESSIVE: Invalidate ALL video queries (nicht nur refetch)
        queryClient.invalidateQueries({ 
          queryKey: ['videos'],
          exact: false // Alle Queries die mit 'videos' starten
        });
        
        // Zusätzlich: Force refetch
        queryClient.refetchQueries({ 
          queryKey: ['videos'],
          type: 'active',
          exact: false
        });
      } else {
        console.log('[useTabFocusRefetch] 😴 Tab hidden - pausing...');
      }
    };

    const handleFocus = () => {
      console.log('[useTabFocusRefetch] 👁️ Window focused - AGGRESSIVE refetching...');
      
      // 🔥 AGGRESSIVE: Invalidate + Refetch
      queryClient.invalidateQueries({ 
        queryKey: ['videos'],
        exact: false
      });
      
      queryClient.refetchQueries({ 
        queryKey: ['videos'],
        type: 'active',
        exact: false
      });
    };

    // Event Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    console.log('[useTabFocusRefetch] ✅ AGGRESSIVE tab focus handlers registered');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      console.log('[useTabFocusRefetch] ❌ Tab focus handlers unregistered');
    };
  }, [queryClient]);
}

