'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { 
  Session, 
  User, 
  SupabaseClient, 
  AuthTokenResponse 
} from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  supabase: SupabaseClient;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
  }>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ 
    data: { user: User | null } | null; 
    error: Error | null;
  }>;
  updatePassword: (newPassword: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isSubscriber: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface SubscriptionPayload {
  new: {
    user_id: string;
    [key: string]: any;
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriber, setIsSubscriber] = useState(false);
  

  const checkSubscription = useCallback(async (userId: string) => {
    try {
      // Get the most recent subscription for this user (regardless of status)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Subscription check error:', error);
        setIsSubscriber(false);
        return;
      }

      console.log("AuthContext - subscription data: ", data);

      // Check if subscription is truly active (not canceled and period hasn't ended)
      const isValid = data && 
        ['active', 'trialing'].includes(data.status) && 
        new Date(data.current_period_end) > new Date() &&
        !data.cancel_at_period_end; // Don't show as active if it's canceled

      console.log("AuthContext - isValid calculation:", {
        hasData: !!data,
        status: data?.status,
        statusValid: data ? ['active', 'trialing'].includes(data.status) : false,
        periodValid: data ? new Date(data.current_period_end) > new Date() : false,
        notCanceled: data ? !data.cancel_at_period_end : false,
        finalResult: !!isValid
      });

      setIsSubscriber(!!isValid);
      console.log("AuthContext - set isSubscriber: ", !!isValid);
    } catch (error) {
      console.error('Subscription check error:', error);
      setIsSubscriber(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          return;
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await checkSubscription(session.user.id);
          } else {
            setIsSubscriber(false);
          }
        }
      } catch (error) {
        console.error('Session retrieval error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkSubscription(session.user.id);
        } else {
          setIsSubscriber(false);
        }
        
        setIsLoading(false);
      }
    });

    // Listen for subscription changes
    const subscriptionChannel = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions'
        },
        async (payload: SubscriptionPayload) => {
          if (mounted && user && payload.new.user_id === user.id) {
            console.log('Subscription changed, rechecking...');
            await checkSubscription(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      subscriptionChannel?.unsubscribe();
    };
  }, [checkSubscription, user?.id]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      session: data.session,
    };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setIsSubscriber(false);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      throw error;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    supabase,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updatePassword,
    resetPassword,
    isSubscriber,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
