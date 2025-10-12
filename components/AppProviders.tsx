'use client';

import { ReactNode } from 'react';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';
import { ConnectionStatus } from './ConnectionStatus';

export function AppProviders({ children }: { children: ReactNode }) {
  // Auto-refresh auth tokens
  useAuthRefresh();

  return (
    <>
      <ConnectionStatus />
      {children}
    </>
  );
}

