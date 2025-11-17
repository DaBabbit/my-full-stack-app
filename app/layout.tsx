'use client';

import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import TopBar from '../components/TopBar';
import ProtectedRoute from '@/contexts/ProtectedRoute';
import { Analytics } from "@vercel/analytics/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AppProviders } from '@/components/AppProviders';
// import { PostHogProvider } from '@/contexts/PostHogContext';
// import { PostHogErrorBoundary } from '@/components/PostHogErrorBoundary';

const geist = Geist({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ⚡ PERFORMANCE: Optimierter QueryClient mit Memory-Management
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 Sekunden - Realtime aktualisiert automatisch
        gcTime: 5 * 60 * 1000, // 5 Minuten Garbage Collection (reduziert von 10min)
        refetchOnWindowFocus: false, // Aus - Realtime übernimmt Updates
        refetchOnMount: true, // Refetch beim Component Mount
        refetchOnReconnect: true, // Refetch bei Reconnect
        retry: 1, // Nur 1 Retry (reduziert von 2)
      },
    },
  }));

  return (
    <html lang="en">
      <body className={geist.className}>
        <Analytics mode="auto" />
        <QueryClientProvider client={queryClient}>
          {/* <PostHogErrorBoundary>
            <PostHogProvider> */}
              <AuthProvider>
                <AppProviders>
                  <ProtectedRoute>
                    <TopBar />    
                    <main>{children}</main>
                  </ProtectedRoute>
                </AppProviders>
              </AuthProvider>
            {/* </PostHogProvider>
          </PostHogErrorBoundary> */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
