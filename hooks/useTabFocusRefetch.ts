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
        console.log('[useTabFocusRefetch] 🔄 Tab is now visible - Force refetching all video queries...');
        
        // Force refetch aller Video-Queries
        queryClient.refetchQueries({ 
          queryKey: ['videos'],
          type: 'active', // Nur aktive Queries
          exact: false // Alle Queries die mit 'videos' starten
        });
      } else {
        console.log('[useTabFocusRefetch] 😴 Tab hidden - pausing...');
      }
    };

    const handleFocus = () => {
      console.log('[useTabFocusRefetch] 👁️ Window focused - Force refetching...');
      queryClient.refetchQueries({ 
        queryKey: ['videos'],
        type: 'active',
        exact: false
      });
    };

    // Event Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    console.log('[useTabFocusRefetch] ✅ Tab focus handlers registered');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      console.log('[useTabFocusRefetch] ❌ Tab focus handlers unregistered');
    };
  }, [queryClient]);
}

