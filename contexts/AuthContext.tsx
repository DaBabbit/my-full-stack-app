'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  updateEmail: (newEmail: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (firstname: string, lastname: string) => Promise<void>;
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
  
  // 🔥 REQUEST GUARD: Verhindert parallele checkSubscription Calls
  const isCheckingSubscriptionRef = useRef<boolean>(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkSubscription = useCallback(async (userId: string) => {
    // GUARD 1: Verhindere parallele Requests
    if (isCheckingSubscriptionRef.current) {
      console.log('[AuthContext] ⏭️ Skipping subscription check - already in progress');
      return;
    }

    // GUARD 2: Debounce - mindestens 2 Sekunden zwischen Checks
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimeRef.current;
    if (timeSinceLastCheck < 2000) {
      console.log(`[AuthContext] ⏭️ Skipping subscription check - too recent (${Math.floor(timeSinceLastCheck / 1000)}s ago)`);
      return;
    }

    isCheckingSubscriptionRef.current = true;
    lastCheckTimeRef.current = now;
    
    try {
      console.log('[AuthContext] 🔍 Checking subscription for user:', userId);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (error) {
        console.error('[AuthContext] ❌ Subscription check error:', error);
        setIsSubscriber(false);
        return;
      }

      const isValid = data && 
        ['active', 'trialing'].includes(data.status) && 
        new Date(data.current_period_end) > new Date();

      setIsSubscriber(!!isValid);
      console.log('[AuthContext] ✅ Subscription check complete - isSubscriber:', !!isValid);
    } catch (error) {
      console.error('[AuthContext] ❌ Subscription check failed:', error);
      setIsSubscriber(false);
    } finally {
      isCheckingSubscriptionRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    console.log("AuthContext - mounted useEffect:", mounted);
    
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log("AuthContext - Starting Try in InitializeAuth!");

        // // First, get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !mounted) {
          setIsLoading(false);
          return;
        }

        // Update initial state
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await checkSubscription(currentUser.id);
        }
        
        // 🔥 DEADLOCK-FIX: onAuthStateChange mit setTimeout (non-blocking)
        // Siehe: https://github.com/supabase/supabase/pull/19902/files
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            if (!mounted) return;
            
            console.log('[AuthContext] Auth state change:', event, newSession?.user?.id);
            
            // ⚡ KRITISCH: setTimeout(0) verhindert Deadlocks bei Tab-Wechsel
            setTimeout(() => {
              if (!mounted) return;
              
              const newUser = newSession?.user ?? null;
              setSession(newSession);
              setUser(newUser);
              
              // Non-blocking: Subscription-Check ohne await
              if (newUser) {
                checkSubscription(newUser.id).catch((err) => {
                  console.error('[AuthContext] ❌ Subscription check failed:', err);
                });
              } else {
                setIsSubscriber(false);
              }
            }, 0);
          }
        );

        // Only set loading to false after everything is initialized
        if (mounted) setIsLoading(false);
        
        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();
  }, [checkSubscription]);

  const value = {
    user,
    session,
    isLoading,
    supabase,
    signInWithGoogle: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
    },
    signInWithEmail: async (email: string, password: string) => {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (authError) throw authError;

      // Check if user was previously soft-deleted
      const { data: profile } = await supabase
        .from('users')
        .select('is_deleted, deleted_at')
        .eq('id', authData.user?.id)
        .single();

      if (profile?.is_deleted) {
        // Reactivate the account
        await supabase
          .from('users')
          .update({ 
            is_deleted: false, 
            deleted_at: null,
            reactivated_at: new Date().toISOString() 
          })
          .eq('id', authData.user?.id);

        // You could trigger a welcome back notification here
      }

      return authData;
    },
    signOut: async () => {
      try {
        // First cleanup all active connections/states
        window.dispatchEvent(new Event('cleanup-before-logout'));
        
        // Wait a small amount of time for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then perform the actual signout
        await supabase.auth.signOut();
        
        // Force redirect to login
        window.location.assign('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    signUpWithEmail: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      return { data, error };
    },
    updatePassword: async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
    },
    updateEmail: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
    },
    resetPassword: async (email: string) => {
      // OTP-basierte Password Reset - keine redirectTo
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/update-password`
        }
      });
      if (error) throw error;
    },
    updateUserProfile: async (firstname: string, lastname: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Update user profile in users table
      const { error } = await supabase
        .from('users')
        .update({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    deleteAccount: async () => {
      // First delete user data from any related tables
      const { error: dataError } = await supabase
        .from('users')
        .delete()
        .eq('id', user?.id);
      
      if (dataError) throw dataError;

      // Then delete the user's subscription if it exists
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user?.id);

      if (subscriptionError) throw subscriptionError;

      // Finally delete the user's auth account
      const { error: authError } = await supabase.auth.admin.deleteUser(
        user?.id as string
      );

      if (authError) throw authError;

      // Sign out after successful deletion
      await supabase.auth.signOut();
    },
    isSubscriber,
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 