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
export function useWindowFocusRefetch(queryKeys: string[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[useWindowFocusRefetch] Tab is now visible, invalidating queries:', queryKeys);
        // Invalidiere alle angegebenen Queries
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    };

    const handleFocus = () => {
      console.log('[useWindowFocusRefetch] Window focused, invalidating queries:', queryKeys);
      // Invalidiere alle angegebenen Queries
      queryKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    };

    // Höre auf beide Events für maximale Kompatibilität
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, queryKeys]);
}

