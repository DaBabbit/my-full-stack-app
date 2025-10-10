import { createClient } from '@supabase/supabase-js';

// 🔥 EINHEITLICHE SUPABASE-INSTANZ für alle Tabs
// Verhindert Auth-State-Desynchronisation zwischen Browser-Tabs

const getSupabaseConfig = () => {
  if (typeof window === 'undefined') {
    // Server-side: Fallback für Build
    return {
      url: 'https://placeholder.supabase.co',
      key: 'placeholder-key'
    };
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
};

const config = getSupabaseConfig();

export const supabase = createClient(
  config.url,
  config.key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // 🔥 Session-Detection in URL
      flowType: 'pkce', // 🔥 PKCE Flow für bessere Sicherheit
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'apikey': config.key,
      },
    },
    db: {
      schema: 'public'
    },
    realtime: {
      // 🔥 REALTIME-KONFIGURATION für Tab-Wechsel
      params: {
        eventsPerSecond: 10, // Rate limiting
      },
      // Automatische Reconnect-Strategie
      heartbeatIntervalMs: 30000, // 30s Heartbeat
      reconnectAfterMs: [1000, 2000, 5000, 10000], // Exponential backoff
    }
  }
); 