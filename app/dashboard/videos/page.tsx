'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import SubscriptionWarning from '@/components/SubscriptionWarning';
import VideoTableSkeleton from '@/components/VideoTableSkeleton';
import NotificationBell from '@/components/NotificationBell';
import PermissionErrorModal from '@/components/PermissionErrorModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ErrorModal from '@/components/ErrorModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  Plus,
  Menu,
  X,
  Search,
  User,
  Edit,
  ExternalLink,
  LogOut,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Clock,
  Scissors,
  Check,
  Rocket,
  Trash2,
  Crown
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import Image from 'next/image';

interface Video {
  id: string;
  name: string;
  status: string;
  storage_location?: string;
  created_at: string;
  publication_date?: string;
  responsible_person?: string;
  inspiration_source?: string;
  description?: string;
  last_updated?: string;
  updated_at?: string;
  duration?: number;
  file_size?: number;
  format?: string;
  thumbnail_url?: string;
  workspace_owner_id?: string;
  created_by?: string;
  // Workspace member permissions (only set for shared workspace videos)
  workspace_permissions?: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

const sidebarItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    active: false
  },
  {
    name: 'Videos',
    icon: Video,
    href: '/dashboard/videos',
    active: true
  }
];

const sidebarBottomItems = [
  {
    name: 'Settings',
    icon: Settings,
    href: '/profile',
    active: false
  }
];


export default function VideosPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const permissions = usePermissions();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [permissionErrorAction, setPermissionErrorAction] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updatingVideoIds, setUpdatingVideoIds] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState({ title: '', message: '', details: '' });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [newVideo, setNewVideo] = useState({
    name: '',
    status: 'Idee',
    publication_date: '',
    responsible_person: '',
    inspiration_source: '',
    description: ''
  });

  // Status-Icons und Farben
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Idee':
        return { icon: Lightbulb, color: 'text-gray-400' };
      case 'Warten auf Aufnahme':
        return { icon: Clock, color: 'text-red-400' };
      case 'In Bearbeitung (Schnitt)':
        return { icon: Scissors, color: 'text-purple-400' };
      case 'Schnitt abgeschlossen':
        return { icon: Check, color: 'text-blue-400' };
      case 'Hochgeladen':
        return { icon: Rocket, color: 'text-green-400' };
      default:
        return { icon: Video, color: 'text-neutral-400' };
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchVideos();
    
    // Set up Supabase Realtime subscription for videos
    const setupRealtimeSubscription = async () => {
      const { supabase } = await import('@/utils/supabase');
      
      // Subscribe to changes in the videos table
      // Note: We listen to ALL videos and filter client-side because we need
      // to catch changes to shared workspace videos as well
      const channel = supabase
        .channel('videos_realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'videos'
            // No filter - we'll catch all changes and refresh to get proper permissions
          },
          (payload) => {
            console.log('[Realtime] Video update received, refreshing...', payload.eventType);
            
            // Simply refresh all videos to ensure proper permissions and workspace membership
            fetchVideos();
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });
      
      return channel;
    };
    
    let channelPromise = setupRealtimeSubscription();
    
    // Handle tab visibility changes - reconnect Realtime and refresh data
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, reconnecting and refreshing data...');
        
        // Refresh data when tab becomes visible
        await fetchVideos();
        
        // Unsubscribe old channel and create new one to ensure fresh connection
        const oldChannel = await channelPromise;
        await oldChannel.unsubscribe();
        console.log('Old channel unsubscribed, creating new subscription...');
        
        // Create new subscription
        const newChannel = await setupRealtimeSubscription();
        channelPromise = Promise.resolve(newChannel);
      } else {
        console.log('Tab hidden, pausing realtime...');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channelPromise.then(channel => {
        channel.unsubscribe();
      });
    };
  }, [user, router]);

  // Handle mobile detection and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (userDropdownOpen && !target.closest('.user-dropdown')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  // Helper function: Check if user can edit a specific video
  const canEditVideo = (video: Video): boolean => {
    // If it's the user's own video (no workspace_permissions = own video)
    if (!video.workspace_permissions) {
      return permissions.canEditVideos;
    }
    // If it's a shared workspace video, check workspace permissions
    return video.workspace_permissions.can_edit;
  };

  // Helper function: Check if user can delete a specific video
  const canDeleteVideo = (video: Video): boolean => {
    // If it's the user's own video (no workspace_permissions = own video)
    if (!video.workspace_permissions) {
      return permissions.canDeleteVideos;
    }
    // If it's a shared workspace video, check workspace permissions
    return video.workspace_permissions.can_delete;
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Get current user to ensure we have the right context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.error('User not authenticated');
        setIsLoading(false);
        return;
      }

      console.log('[fetchVideos] Fetching videos for user:', currentUser.id);
      
      // Step 1: Get workspace memberships (active only)
      const { data: memberships, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_owner_id, permissions')
        .eq('user_id', currentUser.id)
        .eq('status', 'active');

      if (membershipError) {
        console.error('[fetchVideos] Error fetching memberships:', membershipError);
      }

      console.log('[fetchVideos] Active memberships:', memberships?.length || 0);

      // Step 2: Fetch OWN videos (user_id = currentUser.id)
      const { data: ownVideos, error: ownError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          status,
          publication_date,
          responsible_person,
          storage_location,
          inspiration_source,
          description,
          created_at,
          last_updated,
          updated_at,
          duration,
          file_size,
          format,
          thumbnail_url,
          workspace_owner_id,
          created_by
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ownError) {
        console.error('[fetchVideos] Error fetching own videos:', ownError);
      }

      console.log('[fetchVideos] Own videos:', ownVideos?.length || 0);

      // Step 3: Fetch SHARED workspace videos
      let sharedVideos: any[] = [];
      if (memberships && memberships.length > 0) {
        const workspaceOwnerIds = memberships.map(m => m.workspace_owner_id);
        
        const { data: shared, error: sharedError } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            status,
            publication_date,
            responsible_person,
            storage_location,
            inspiration_source,
            description,
            created_at,
            last_updated,
            updated_at,
            duration,
            file_size,
            format,
            thumbnail_url,
            workspace_owner_id,
            created_by
          `)
          .in('workspace_owner_id', workspaceOwnerIds)
          .order('created_at', { ascending: false });

        if (sharedError) {
          console.error('[fetchVideos] Error fetching shared videos:', sharedError);
        } else {
          // Attach permissions to each shared video
          sharedVideos = shared?.map(video => {
            const membership = memberships.find(m => m.workspace_owner_id === video.workspace_owner_id);
            return {
              ...video,
              workspace_permissions: membership?.permissions
            };
          }) || [];
          
          console.log('[fetchVideos] Shared videos:', sharedVideos.length);
        }
      }

      // Step 4: Combine own and shared videos
      const allVideos = [...(ownVideos || []), ...sharedVideos];

      // Transform data to match interface
      const transformedVideos = allVideos.map(video => ({
        id: video.id,
        name: video.title,
        status: video.status,
        storage_location: video.storage_location,
        created_at: video.created_at,
        publication_date: video.publication_date,
        responsible_person: video.responsible_person,
        inspiration_source: video.inspiration_source,
        description: video.description,
        last_updated: video.last_updated,
        updated_at: video.updated_at,
        duration: video.duration,
        file_size: video.file_size,
        format: video.format,
        thumbnail_url: video.thumbnail_url,
        workspace_owner_id: video.workspace_owner_id,
        created_by: video.created_by,
        workspace_permissions: video.workspace_permissions
      }));

      // Sort by created_at descending
      transformedVideos.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setVideos(transformedVideos);
      setLastFetchTime(Date.now());
      
      console.log(`[fetchVideos] Successfully loaded ${transformedVideos.length} videos (${ownVideos?.length || 0} own, ${sharedVideos.length} shared)`);
    } catch (error) {
      console.error('[fetchVideos] Error fetching videos:', error);
      setErrorDetails({
        title: 'Fehler beim Laden der Videos',
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Umfassende Validierung
    const trimmedName = newVideo.name.trim()
  
  
    ;
    
    if (!trimmedName) {
      alert('Bitte geben Sie einen Videotitel ein.');
      return;
    }

   
    
    if (trimmedName.length < 3) {
      alert('Der Videotitel muss mindestens 3 Zeichen lang sein.');
      return;
    }
    
    if (trimmedName.length > 100) {
      alert('Der Videotitel darf maximal 100 Zeichen lang sein.');
      return;
    }
    
    // Prüfung auf nur Leerzeichen oder ungültige Zeichen
    if (!/^[\w\s\-\.\,\!\?\(\)\[\]äöüÄÖÜß]+$/.test(trimmedName)) {
      alert('Der Videotitel enthält ungültige Zeichen. Verwenden Sie nur Buchstaben, Zahlen, Leerzeichen und grundlegende Satzzeichen.');
      return;
    }

    // Validierung für URLs (optional)
    if (newVideo.inspiration_source && newVideo.inspiration_source.trim()) {
      try {
        new URL(newVideo.inspiration_source);
      } catch {
        alert('Bitte geben Sie eine gültige URL für die Inspiration Quelle ein (z.B. https://...).');
        return;
      }
    }

    // Validierung für Datum
    if (newVideo.publication_date && newVideo.publication_date.trim()) {
      const selectedDate = new Date(newVideo.publication_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        const confirmPastDate = confirm('Das gewählte Veröffentlichungsdatum liegt in der Vergangenheit. Möchten Sie trotzdem fortfahren?');
        if (!confirmPastDate) {
          return;
        }
      }
    }

    try {
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        alert('Sie müssen angemeldet sein, um Videos zu erstellen.');
        return;
      }

      // Ensure user exists in users table (fix foreign key constraint)
      const { error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (userCheckError && userCheckError.code === 'PGRST116') {
        // User doesn't exist in users table, create them
        console.log('Creating user in users table...');
        const { error: createUserError } = await supabase
          .from('users')
          .insert([
            {
              id: currentUser.id,
              email: currentUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false
            }
          ]);

        if (createUserError) {
          console.error('Error creating user:', createUserError);
          alert('Fehler beim Erstellen des Benutzers. Bitte versuche es erneut.');
          return;
        }
      }
      
      // Insert new video directly to Supabase
      const { data, error } = await supabase
        .from('videos')
        .insert([
          {
            user_id: currentUser.id,
            title: trimmedName,
            status: newVideo.status,
            publication_date: newVideo.publication_date || null,
            responsible_person: newVideo.responsible_person || null,
            storage_location: null, // Will be set automatically via Nextcloud integration
            inspiration_source: newVideo.inspiration_source || null,
            description: newVideo.description || null,
          }
        ])
        .select();

      if (error) {
        console.error('Error creating video:', error);
        let errorMessage = 'Fehler beim Erstellen des Videos';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte, Videos zu erstellen.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Video-Erstellung fehlgeschlagen: Es gab ein Problem mit der Datenbankstruktur. Bitte kontaktieren Sie den Support.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Zugriff verweigert: Sie haben keine Berechtigung, Videos zu erstellen.';
        } else {
          errorMessage = `Fehler beim Erstellen des Videos: ${error.message}`;
        }
        
        setErrorDetails({
          title: 'Video-Erstellung fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      if (!data || data.length === 0) {
        throw new Error('Video konnte nicht erstellt werden');
      }

      console.log('Video erfolgreich erstellt!');

      // Realtime subscription will handle adding the new video automatically
      // No need to manually update state here
      setShowAddModal(false);
      setNewVideo({
        name: '',
        status: 'Idee',
        publication_date: '',
        responsible_person: '',
        inspiration_source: '',
        description: ''
      });
    } catch (error) {
      console.error('Error adding video:', error);
      setErrorDetails({
        title: 'Video-Erstellung fehlgeschlagen',
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    }
  };

  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    // Check permissions first
    if (!permissions.canEditVideos) {
      setPermissionErrorAction('Status ändern');
      setShowPermissionError(true);
      return;
    }

    // Optimistic update - immediately update UI
    setVideos(prevVideos => 
      prevVideos.map(video => 
        video.id === videoId 
          ? { ...video, status: newStatus, updated_at: new Date().toISOString() }
          : video
      )
    );

    // Add to updating set
    setUpdatingVideoIds(prev => new Set(prev).add(videoId));

    try {
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Get current user to ensure we have the right context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }
      
      // Update video status directly in Supabase with explicit user_id check
      const { data, error } = await supabase
        .from('videos')
        .update({ 
          status: newStatus,
          last_updated: new Date().toISOString()
        })
        .eq('id', videoId)
        .eq('user_id', currentUser.id) // Explicit user_id check for security
        .select();

      if (error) {
        console.error('Error updating video status:', error);
        
        // Revert optimistic update on error
        setVideos(prevVideos => 
          prevVideos.map(video => 
            video.id === videoId 
              ? { ...video, status: video.status } // Revert to original status
              : video
          )
        );
        
        // Better error message for RLS violations
        let errorMessage = 'Fehler beim Aktualisieren des Status';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte für diese Status-Änderung.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Status-Änderung fehlgeschlagen: Es gab ein Problem mit der Datenbankstruktur. Bitte kontaktieren Sie den Support.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Zugriff verweigert: Sie haben keine Berechtigung, dieses Video zu bearbeiten.';
        } else {
          errorMessage = `Fehler beim Aktualisieren des Status: ${error.message}`;
        }
        
        // Show nice error modal instead of alert
        setErrorDetails({
          title: 'Status-Update fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      if (!data || data.length === 0) {
        throw new Error('Video nicht gefunden oder keine Berechtigung');
      }

      console.log('Status erfolgreich aktualisiert!');
      
      // Realtime subscription will handle the update automatically
      // No need to manually update state here
      
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Revert optimistic update on error
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === videoId 
            ? { ...video, status: video.status } // Revert to original status
            : video
        )
      );
      
      setErrorDetails({
        title: 'Status-Update fehlgeschlagen',
        message: 'Fehler beim Aktualisieren des Status. Bitte versuche es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    } finally {
      // Remove from updating set
      setUpdatingVideoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setShowEditModal(true);
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    try {
      const { supabase } = await import('@/utils/supabase');
      
      // Get current user to ensure we have the right context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }
      
      const { data, error } = await supabase
        .from('videos')
        .update({
          title: editingVideo.name,
          status: editingVideo.status,
          publication_date: editingVideo.publication_date || null,
          responsible_person: editingVideo.responsible_person || null,
          inspiration_source: editingVideo.inspiration_source || null,
          description: editingVideo.description || null,
          last_updated: new Date().toISOString()
        })
        .eq('id', editingVideo.id)
        .eq('user_id', currentUser.id) // Explicit user_id check for security
        .select();

      if (error) {
        console.error('Error updating video:', error);
        let errorMessage = 'Fehler beim Aktualisieren des Videos';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte, dieses Video zu bearbeiten.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Video-Update fehlgeschlagen: Es gab ein Problem mit der Datenbankstruktur. Bitte kontaktieren Sie den Support.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Zugriff verweigert: Sie haben keine Berechtigung, dieses Video zu bearbeiten.';
        } else {
          errorMessage = `Fehler beim Aktualisieren des Videos: ${error.message}`;
        }
        
        setErrorDetails({
          title: 'Video-Update fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      if (!data || data.length === 0) {
        throw new Error('Video nicht gefunden oder keine Berechtigung');
      }

      // Realtime subscription will handle the update automatically
      // No need to manually update state here
      
      setShowEditModal(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error updating video:', error);
      setErrorDetails({
        title: 'Video-Update fehlgeschlagen',
        message: 'Fehler beim Aktualisieren des Videos. Bitte versuchen Sie es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    }
  };

  const handleDeleteVideo = (video: Video) => {
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      const { supabase } = await import('@/utils/supabase');
      
      // Get current user to ensure we have the right context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }
      
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoToDelete.id)
        .eq('user_id', currentUser.id); // Explicit user_id check for security

      if (error) {
        console.error('Error deleting video:', error);
        let errorMessage = 'Fehler beim Löschen des Videos';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte, dieses Video zu löschen.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Video-Löschung fehlgeschlagen: Es gab ein Problem mit der Datenbankstruktur. Bitte kontaktieren Sie den Support.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Zugriff verweigert: Sie haben keine Berechtigung, dieses Video zu löschen.';
        } else {
          errorMessage = `Fehler beim Löschen des Videos: ${error.message}`;
        }
        
        setErrorDetails({
          title: 'Video-Löschung fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      // Realtime subscription will handle the deletion automatically
      // No need to manually update state here
      setShowDeleteModal(false);
      setVideoToDelete(null);
    } catch (error) {
      console.error('Error deleting video:', error);
      setErrorDetails({
        title: 'Video-Löschung fehlgeschlagen',
        message: 'Fehler beim Löschen des Videos. Bitte versuchen Sie es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    }
  };

  // Filter videos based on search term
  const filteredVideos = videos.filter(video => {
    if (!searchTerm.trim()) return true; // Show all videos if search is empty
    
    const searchLower = searchTerm.toLowerCase();
    const matches = (
      video.name.toLowerCase().includes(searchLower) ||
      video.status.toLowerCase().includes(searchLower) ||
      (video.responsible_person && video.responsible_person.toLowerCase().includes(searchLower)) ||
      (video.description && video.description.toLowerCase().includes(searchLower)) ||
      (video.inspiration_source && video.inspiration_source.toLowerCase().includes(searchLower))
    );
    
    // Debug log
    if (searchTerm.trim()) {
      console.log(`Search: "${searchTerm}" -> Video: "${video.name}" -> Match: ${matches}`);
    }
    
    return matches;
  });

  // Helper function for date formatting with leading zeros
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '-';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <span className="loading loading-ring loading-lg text-white"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-neutral-800 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 mr-2 text-white rounded-lg md:hidden hover:bg-neutral-800 transition-colors"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            
            <div className="flex items-center">
              <Image
                src="/kosmamedia-logo.svg"
                alt="kosmamedia Logo"
                width={32}
                height={32}
                className="mr-3 filter invert"
              />
              <span className="text-xl font-semibold text-white">kosmamedia</span>
            </div>

            {/* Search Bar */}
            <div className="hidden md:block md:ml-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-white focus:border-white block w-64 pl-10 p-2.5 placeholder-neutral-400"
                  placeholder="Videos suchen..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative user-dropdown">
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 text-white hover:bg-neutral-800 rounded-lg p-2 transition-colors"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-black" />
                  </div>
                  {/* Premium Crown */}
                  {permissions.hasActiveSubscription && permissions.subscriptionStatus === 'active' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                      <Crown className="w-2.5 h-2.5 text-yellow-900" />
                    </div>
                  )}
                </div>
                <span className="hidden md:block text-sm">{user.email}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-black/80 backdrop-blur-md rounded-xl border border-neutral-700 shadow-lg z-50"
                >
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-neutral-700">
                      <p className="text-sm text-white font-medium">{user.email}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-neutral-400">Angemeldet</p>
                        <div className="flex items-center space-x-1">
                          {permissions.subscriptionStatus === 'active' && (
                            <>
                              <Crown className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400 font-medium">Premium</span>
                            </>
                          )}
                          {permissions.subscriptionStatus === 'trialing' && (
                            <span className="text-xs text-blue-400 font-medium">Trial</span>
                          )}
                          {permissions.subscriptionStatus === 'expired' && (
                            <span className="text-xs text-orange-400 font-medium">Abgelaufen</span>
                          )}
                          {permissions.subscriptionStatus === 'none' && (
                            <span className="text-xs text-neutral-500 font-medium">Kostenlos</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push('/profile');
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-white hover:bg-neutral-800/50 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3 text-neutral-400" />
                      Einstellungen
                    </button>
                    
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        router.push('/profile');
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-white hover:bg-neutral-800/50 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 mr-3 text-neutral-400" />
                      Abonnement verwalten
                    </button>
                    
                    <div className="border-t border-neutral-700 mt-2">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center px-4 py-3 text-sm text-white hover:bg-neutral-800/50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3 text-neutral-400" />
                        Ausloggen
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? '80px' : '256px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 left-0 z-40 h-screen pt-16 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-neutral-900/50 backdrop-blur-md border-r border-neutral-700 md:translate-x-0`}
      >
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
          {/* Collapse Toggle Button - Desktop Only */}
          <div className="hidden md:flex justify-end mb-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all duration-300 hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Items */}
          <ul className="space-y-2 font-medium flex-1">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`flex items-center p-3 rounded-2xl w-full text-left transition-all duration-300 ${
                    item.active 
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'text-white hover:bg-neutral-800/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <item.icon className={`w-6 h-6 ${item.active ? 'text-black' : 'text-neutral-400'} transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                  {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
                </button>
              </li>
            ))}
          </ul>

          {/* Bottom Navigation Items */}
          <ul className="space-y-2 font-medium border-t border-neutral-700 pt-4">
            {sidebarBottomItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`flex items-center p-3 rounded-2xl w-full text-left transition-all duration-300 ${
                    item.active 
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                      : 'text-white hover:bg-neutral-800/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <item.icon className={`w-6 h-6 ${item.active ? 'text-black' : 'text-neutral-400'} transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                  {!sidebarCollapsed && <span className="ml-3">{item.name}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </motion.aside>

      {/* Main Content */}
      <motion.main 
        animate={{ 
          marginLeft: isMobile ? '0px' : (sidebarCollapsed ? '80px' : '256px')
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="p-4 ml-0 md:ml-64 pt-24"
      >
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Videos</h1>
              <p className="text-neutral-400">Verwalte deine Video-Projekte und deren Status</p>
            </div>
            <button
              onClick={() => {
                if (permissions.canCreateVideos) {
                  setShowAddModal(true);
                } else {
                  setPermissionErrorAction('Video erstellen');
                  setShowPermissionError(true);
                }
              }}
              className={`px-4 md:px-6 py-3 rounded-3xl flex items-center justify-center space-x-2 transition-all duration-300 sm:flex-shrink-0 ${
                permissions.canCreateVideos 
                  ? 'bg-neutral-800 hover:bg-white hover:text-black text-white border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-400 hover:text-neutral-300 border border-neutral-600 cursor-pointer'
              }`}
              title={!permissions.canCreateVideos ? 'Berechtigungen anzeigen' : ''}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Neues Video</span>
              <span className="sm:hidden">Video hinzufügen</span>
            </button>
          </div>
          
          {/* Subscription Warning */}
          <SubscriptionWarning className="mt-6" />
          
          {/* Mobile Search Bar */}
          <div className="md:hidden mt-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl focus:ring-white focus:border-white block w-full pl-10 p-3 placeholder-neutral-400"
                placeholder="Videos suchen..."
              />
            </div>
          </div>
        </div>

        {/* Videos Table */}
        {isLoading ? (
          <VideoTableSkeleton />
        ) : (
          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-white">Alle Videos</h3>
            </div>

            {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Keine Videos gefunden' : 'Noch keine Videos'}
              </h3>
              <p className="text-neutral-400 mb-4">
                {searchTerm 
                  ? `Keine Videos gefunden für "${searchTerm}". Versuchen Sie einen anderen Suchbegriff.`
                  : 'Erstellen Sie Ihr erstes Video, um zu beginnen.'
                }
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-neutral-800 hover:bg-white hover:text-black text-white px-6 py-3 rounded-3xl flex items-center space-x-2 mx-auto transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Plus className="h-4 w-4" />
                <span>Erstes Video erstellen</span>
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700">
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Videotitel</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Veröffentlichung</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Verantwortlich</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Speicherort</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Aktualisiert</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Inspiration</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Beschreibung</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredVideos.map((video) => {
                    const statusInfo = getStatusIcon(video.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={video.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                        {/* Videotitel mit Status-Icon */}
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className={`p-2 bg-neutral-800 rounded-lg mr-3`}>
                              <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                            </div>
                            <div>
                              <p className="text-white font-medium">{video.name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {permissions.canEditVideos ? (
                            <CustomDropdown
                              options={[
                                { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
                                { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
                                { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung (Schnitt)', icon: Scissors, iconColor: 'text-purple-400' },
                                { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
                                { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
                              ]}
                              value={video.status}
                              onChange={(newStatus) => handleUpdateStatus(video.id, newStatus)}
                            />
                          ) : (
                            <div className="flex items-center px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-xl cursor-not-allowed">
                              {(() => {
                                const statusInfo = getStatusIcon(video.status);
                                const StatusIcon = statusInfo.icon;
                                return (
                                  <>
                                    <StatusIcon className={`w-4 h-4 mr-2 ${statusInfo.color}`} />
                                    <span className="text-neutral-400 text-sm">{video.status}</span>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </td>

                        {/* Veröffentlichungsdatum */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {formatDate(video.publication_date)}
                        </td>

                        {/* Verantwortlichkeit */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {video.responsible_person || '-'}
                        </td>

                        {/* Speicherort */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {video.storage_location ? (
                            <a 
                              href={video.storage_location} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Link
                            </a>
                          ) : '-'}
                        </td>

                        {/* Zuletzt aktualisiert */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {formatDate(video.last_updated || video.updated_at)}
                        </td>

                        {/* Inspiration Quelle */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {video.inspiration_source ? (
                            <a 
                              href={video.inspiration_source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Link
                            </a>
                          ) : '-'}
                        </td>

                        {/* Beschreibung */}
                        <td className="py-4 px-4 text-neutral-300 text-sm max-w-xs">
                          <div className="truncate" title={video.description || ''}>
                            {video.description || '-'}
                          </div>
                        </td>

                        {/* Aktionen */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                if (canEditVideo(video)) {
                                  handleEditVideo(video);
                                } else {
                                  setPermissionErrorAction('Video bearbeiten');
                                  setShowPermissionError(true);
                                }
                              }}
                              className={`transition-colors ${
                                canEditVideo(video)
                                  ? 'text-white hover:text-neutral-300' 
                                  : 'text-neutral-600 hover:text-neutral-500 cursor-pointer'
                              }`}
                              title={canEditVideo(video) ? 'Video bearbeiten' : 'Keine Berechtigung'}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            {canDeleteVideo(video) && (
                              <button
                                onClick={() => handleDeleteVideo(video)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Video löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            
                            {video.storage_location && (
                              <a
                                href={video.storage_location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-neutral-300"
                                title="Speicherort öffnen"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {filteredVideos.map((video) => {
                  const statusInfo = getStatusIcon(video.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <div key={video.id} className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-4 space-y-4">
                      {/* Header mit Titel und Status Icon */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <div className={`p-2 bg-neutral-800 rounded-lg mr-3 flex-shrink-0`}>
                            <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white font-medium truncate">{video.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (canEditVideo(video)) {
                                handleEditVideo(video);
                              } else {
                                setPermissionErrorAction('Video bearbeiten');
                                setShowPermissionError(true);
                              }
                            }}
                            className={`p-1 transition-colors ${
                              canEditVideo(video)
                                ? 'text-white hover:text-neutral-300' 
                                : 'text-neutral-600 hover:text-neutral-500 cursor-pointer'
                            }`}
                            title={canEditVideo(video) ? 'Video bearbeiten' : 'Keine Berechtigung'}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {canDeleteVideo(video) && (
                            <button
                              onClick={() => handleDeleteVideo(video)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Video löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          
                          {video.storage_location && (
                            <a
                              href={video.storage_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-neutral-300 p-1"
                              title="Speicherort öffnen"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-2">Status</label>
                        {permissions.canEditVideos ? (
                          <CustomDropdown
                            options={[
                              { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
                              { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
                              { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung (Schnitt)', icon: Scissors, iconColor: 'text-purple-400' },
                              { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
                              { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
                            ]}
                            value={video.status}
                            onChange={(newStatus) => handleUpdateStatus(video.id, newStatus)}
                            className="text-sm"
                          />
                        ) : (
                          <div className="flex items-center px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-xl cursor-not-allowed text-sm">
                            {(() => {
                              const statusInfo = getStatusIcon(video.status);
                              const StatusIcon = statusInfo.icon;
                              return (
                                <>
                                  <StatusIcon className={`w-4 h-4 mr-2 ${statusInfo.color}`} />
                                  <span className="text-neutral-400">{video.status}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Veröffentlichung</label>
                          <p className="text-neutral-300">
                            {formatDate(video.publication_date)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Verantwortlich</label>
                          <p className="text-neutral-300 truncate" title={video.responsible_person || ''}>
                            {video.responsible_person || '-'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Speicherort</label>
                          {video.storage_location ? (
                            <a 
                              href={video.storage_location} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline truncate block"
                            >
                              Link
                            </a>
                          ) : (
                            <p className="text-neutral-300">-</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Aktualisiert</label>
                          <p className="text-neutral-300">
                            {formatDate(video.last_updated || video.updated_at)}
                          </p>
                        </div>
                      </div>

                      {/* Inspiration und Beschreibung */}
                      {(video.inspiration_source || video.description) && (
                        <div className="space-y-3 pt-2 border-t border-neutral-700">
                          {video.inspiration_source && (
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Inspiration</label>
                              <a 
                                href={video.inspiration_source} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline text-sm truncate block"
                              >
                                Link
                              </a>
                            </div>
                          )}
                          {video.description && (
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Beschreibung</label>
                              <p className="text-neutral-300 text-sm leading-relaxed">{video.description}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
            )}
          </div>
        )}
      </motion.main>

      {/* Add Video Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 touch-action-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-4 md:p-6 max-w-2xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto overscroll-y-contain touch-action-pan-y"
            >
            <h3 className="text-xl font-semibold mb-6 text-white">🎬 Neues Video erstellen</h3>
            <form onSubmit={handleAddVideo}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Titel */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Video Titel *
                  </label>
                  <input
                    type="text"
                    value={newVideo.name}
                    onChange={(e) => setNewVideo({ ...newVideo, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="z.B. Mein YouTube Tutorial"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Status
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
                      { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
                      { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung (Schnitt)', icon: Scissors, iconColor: 'text-purple-400' },
                      { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
                      { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
                    ]}
                    value={newVideo.status}
                    onChange={(status) => setNewVideo({ ...newVideo, status })}
                  />
                </div>

                {/* Veröffentlichungsdatum */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Geplantes Veröffentlichungsdatum
                  </label>
                  <input
                    type="date"
                    value={newVideo.publication_date}
                    onChange={(e) => setNewVideo({ ...newVideo, publication_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  />
                </div>

                {/* Verantwortliche Person */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Verantwortliche Person
                  </label>
                  <input
                    type="text"
                    value={newVideo.responsible_person}
                    onChange={(e) => setNewVideo({ ...newVideo, responsible_person: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="z.B. Max Mustermann"
                  />
                </div>

                {/* Inspiration Quelle */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Inspiration Quelle
                  </label>
                  <input
                    type="url"
                    value={newVideo.inspiration_source}
                    onChange={(e) => setNewVideo({ ...newVideo, inspiration_source: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                {/* Beschreibung */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={newVideo.description}
                    onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white resize-none"
                    placeholder="Kurze Beschreibung des Videos..."
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-lg transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  Video erstellen
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {showEditModal && editingVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40 touch-action-none"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-4 md:p-6 max-w-2xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto overscroll-y-contain touch-action-pan-y"
            >
            <h3 className="text-xl font-semibold mb-6 text-white">✏️ Video bearbeiten</h3>
            <form onSubmit={handleUpdateVideo}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Titel */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Video Titel *
                  </label>
                  <input
                    type="text"
                    value={editingVideo.name}
                    onChange={(e) => setEditingVideo({ ...editingVideo, name: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="z.B. Mein YouTube Tutorial"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Status
                  </label>
                  <CustomDropdown
                    options={[
                      { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
                      { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
                      { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung (Schnitt)', icon: Scissors, iconColor: 'text-purple-400' },
                      { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
                      { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
                    ]}
                    value={editingVideo.status}
                    onChange={(status) => setEditingVideo({ ...editingVideo, status })}
                  />
                </div>

                {/* Veröffentlichungsdatum */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Geplantes Veröffentlichungsdatum
                  </label>
                  <input
                    type="date"
                    value={editingVideo.publication_date || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, publication_date: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  />
                </div>

                {/* Verantwortliche Person */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Verantwortliche Person
                  </label>
                  <input
                    type="text"
                    value={editingVideo.responsible_person || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, responsible_person: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="z.B. Max Mustermann"
                  />
                </div>

                {/* Inspiration Quelle */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Inspiration Quelle
                  </label>
                  <input
                    type="url"
                    value={editingVideo.inspiration_source || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, inspiration_source: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                {/* Beschreibung */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={editingVideo.description || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white resize-none"
                    placeholder="Kurze Beschreibung des Videos..."
                  />
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingVideo(null);
                  }}
                  className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-lg transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  Änderungen speichern
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Permission Error Modal */}
      <PermissionErrorModal
        isOpen={showPermissionError}
        onClose={() => setShowPermissionError(false)}
        action={permissionErrorAction}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setVideoToDelete(null);
        }}
        onConfirm={confirmDeleteVideo}
        title="Video löschen"
        message={`Möchten Sie das Video "${videoToDelete?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        itemName={videoToDelete?.name}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorDetails.title}
        message={errorDetails.message}
        details={errorDetails.details}
      />
    </div>
  );
}
