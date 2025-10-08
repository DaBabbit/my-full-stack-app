'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  link?: string;
  icon?: string;
}

export interface UserProfile {
  firstname: string | null;
  lastname: string | null;
  onboarding_completed_at: string | null;
}

export function useOnboarding() {
  const { user, supabase } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile from Supabase
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('firstname, lastname, onboarding_completed_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      
      // Generate tasks based on profile
      const generatedTasks = generateTasks(data as UserProfile);
      setTasks(generatedTasks);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load onboarding status');
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  // Generate onboarding tasks based on user profile
  const generateTasks = (userProfile: UserProfile): OnboardingTask[] => {
    const hasName = userProfile.firstname && userProfile.lastname;
    
    return [
      {
        id: 'add-name',
        title: 'Vor- und Nachname eingeben',
        description: 'Vervollständige dein Profil',
        completed: !!hasName,
        link: '/profile',
        icon: 'user'
      },
      {
        id: 'create-first-video',
        title: 'Erstelle dein erstes Video',
        description: 'Starte mit deinem ersten Content-Projekt',
        completed: false, // Will be checked against videos table later
        link: '/dashboard/videos',
        icon: 'video'
      }
    ];
  };

  // Check if user has created first video
  const checkFirstVideoCreated = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) throw error;

      // Update task completion status
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === 'create-first-video'
            ? { ...task, completed: (data && data.length > 0) }
            : task
        )
      );
    } catch (err) {
      console.error('Error checking videos:', err);
    }
  }, [user?.id, supabase]);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Check for first video after profile is loaded
  useEffect(() => {
    if (profile && user) {
      checkFirstVideoCreated();
    }
  }, [profile, user, checkFirstVideoCreated]);

  // Realtime subscription for profile changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`onboarding_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          const updated = payload.new as UserProfile;
          setProfile(updated);
          setTasks(generateTasks(updated));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'videos',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Video created, updating tasks');
          checkFirstVideoCreated();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, checkFirstVideoCreated]);

  // Complete a specific task (for future use)
  const completeTask = useCallback((taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );
  }, []);

  // Check if onboarding is complete
  const isOnboardingComplete = useCallback(() => {
    return tasks.every(task => task.completed);
  }, [tasks]);

  // Get number of completed tasks
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return {
    profile,
    tasks,
    isLoading,
    error,
    completedCount,
    totalCount,
    progressPercentage,
    isOnboardingComplete: isOnboardingComplete(),
    hasName: !!(profile?.firstname && profile?.lastname),
    completeTask,
    refreshProfile: fetchProfile
  };
}

