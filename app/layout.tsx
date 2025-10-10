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
// import { PostHogProvider } from '@/contexts/PostHogContext';
// import { PostHogErrorBoundary } from '@/components/PostHogErrorBoundary';

const geist = Geist({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Create QueryClient instance per component to avoid sharing state between requests
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 Minuten - Daten gelten als fresh
        gcTime: 1000 * 60 * 10, // 10 Minuten - Cache-Zeit
        refetchOnWindowFocus: true, // Automatisch bei Tab-Fokus refetchen
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: 2, // 2 Retry-Versuche bei Fehlern
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
                  <ProtectedRoute>
                    <TopBar />    
                    <main>{children}</main>
                  </ProtectedRoute>
              </AuthProvider>
            {/* </PostHogProvider>
          </PostHogErrorBoundary> */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
