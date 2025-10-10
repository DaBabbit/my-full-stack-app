// hooks/useWindowFocus.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom Hook der explizit auf Window Focus Events hört
 * und React Query Cache invalidiert.
 * 
 * Dies ist ein Backup-Mechanismus falls refetchOnWindowFocus nicht richtig funktioniert.
 */
export function useWindowFocusRefetch(queryKey: string[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[useWindowFocusRefetch] Tab is now visible, invalidating query:', queryKey);
        queryClient.invalidateQueries({ queryKey });
      }
    };

    const handleFocus = () => {
      console.log('[useWindowFocusRefetch] Window focused, invalidating query:', queryKey);
      queryClient.invalidateQueries({ queryKey });
    };

    // Höre auf beide Events für maximale Kompatibilität
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, JSON.stringify(queryKey)]); // JSON.stringify für stabile Dependency
}

