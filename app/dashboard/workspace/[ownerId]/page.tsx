'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useSharedWorkspaces } from '@/hooks/useSharedWorkspaces';
import { useSharedWorkspaceVideosQuery, useVideoMutations, type Video } from '@/hooks/useVideosQuery';
import { useRealtimeWorkspaceVideos } from '@/hooks/useRealtimeVideos';
import { useTabFocusRefetch } from '@/hooks/useTabFocusRefetch';
import { supabase } from '@/utils/supabase';
import VideoTableSkeleton from '@/components/VideoTableSkeleton';
import NotificationBell from '@/components/NotificationBell';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ErrorModal from '@/components/ErrorModal';
import EditableDescription from '@/components/EditableDescription';
import EditableDate from '@/components/EditableDate';
import EditableResponsiblePerson from '@/components/EditableResponsiblePerson';
import ResponsiblePersonAvatar from '@/components/ResponsiblePersonAvatar';
import { ToastContainer, ToastProps } from '@/components/Toast';
import BulkEditBar from '@/components/BulkEditBar';
import { FileUploadModal } from '@/components/FileUploadModal';
import { Tooltip } from '@/components/Tooltip';
import { TableColumnsSettings, type ColumnConfig } from '@/components/TableColumnsSettings';
import { ViewTabs } from '@/components/ViewTabs';
import { ViewCreateModal } from '@/components/ViewCreateModal';
import { DraggableTableHeader, getVisibleColumnOrder } from '@/components/DraggableTableHeader';
import { useTableSettings } from '@/hooks/useTableSettings';
import { useWorkspaceViews, type WorkspaceView } from '@/hooks/useWorkspaceViews';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Video as VideoIcon,
  Settings,
  Menu,
  X,
  Search,
  User,
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
  Users,
  Edit3,
  CheckSquare,
  Upload,
  FolderOpen,
  Loader2
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import Image from 'next/image';

interface WorkspacePermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

// Default-Spalten-Konfiguration
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'checkbox', label: '', fixed: true, resizable: false },
  { id: 'title', label: 'Name', resizable: true },
  { id: 'status', label: 'Status', resizable: true },
  { id: 'publication_date', label: 'Veröffentlichung', resizable: true },
  { id: 'responsible_person', label: 'Verantwortlich', resizable: true },
  { id: 'upload', label: 'Datei hochladen', resizable: true },
  { id: 'storage_location', label: 'Speicherort', resizable: true },
  { id: 'inspiration_source', label: 'Inspiration', resizable: true },
  { id: 'description', label: 'Beschreibung', resizable: true },
  { id: 'updated_at', label: 'Aktualisiert', resizable: true },
  { id: 'actions', label: 'Aktionen', fixed: true, resizable: false }
];

export default function SharedWorkspacePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ownerId = params?.ownerId as string;
  
  const { sharedWorkspaces, isLoading: workspacesLoading } = useSharedWorkspaces();
  
  // React Query Hooks - isLoading nur beim ersten Load, nicht bei Background Refetch
  const { 
    data: videos = [], 
    isLoading,
    isFetching,
    refetch
  } = useSharedWorkspaceVideosQuery(ownerId);
  const { 
    updateWorkspaceVideo, 
    updateWorkspaceVideoAsync,
    deleteWorkspaceVideo,
    bulkUpdateWorkspaceVideosAsync
  } = useVideoMutations();
  
  // Setup Realtime
  useRealtimeWorkspaceVideos(ownerId);
  
  // 🔥 Force refetch bei Tab-Fokus (zusätzliche Absicherung)
  useTabFocusRefetch();

  // Realtime Change Detection für externe Änderungen (mit Toast-Notification)
  useEffect(() => {
    if (!ownerId || !user) return;

    let changesPending = false;

    console.log('[SharedWorkspacePage] 📡 Setting up change detection for external updates');
    
    const channel = supabase
      .channel(`workspace_changes_${ownerId}_${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'videos', 
          filter: `user_id=eq.${ownerId}`
        },
        (payload: unknown) => {
          console.log('[SharedWorkspacePage] 📡 Change detected:', payload);
          
          // Zeige Toast nur wenn noch keine Änderungen anstehen
          if (!changesPending) {
            changesPending = true;
            
            addToast({
              type: 'warning',
              title: 'Neue Änderungen verfügbar',
              message: 'Ein Workspace-Mitglied hat Änderungen vorgenommen',
              actionLabel: '→ Aktualisieren',
              duration: 0, // Toast bleibt bis zum Click
              onClick: () => {
                console.log('[SharedWorkspacePage] 🔄 Refetching data after user click');
                refetch();
                changesPending = false;
              }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[SharedWorkspacePage] 🔌 Change detection status:', status);
      });
    
    return () => {
      console.log('[SharedWorkspacePage] 🧹 Cleaning up change detection');
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, user, refetch]);
  
  // Nur Skeleton zeigen beim ersten Load, nicht bei Background Refetch
  const showSkeleton = isLoading && !videos.length;
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails] = useState<{ title: string; message: string; details: string }>({ title: '', message: '', details: '' });
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  
  const [workspaceOwnerName, setWorkspaceOwnerName] = useState<string>('');
  const [workspaceOwnerInfo, setWorkspaceOwnerInfo] = useState<{ firstname: string; lastname: string; email: string } | undefined>(undefined);
  const [workspaceMembers, setWorkspaceMembers] = useState<Array<{ id: string; user?: { firstname?: string; lastname?: string; email: string } }>>([]);
  const [permissions, setPermissions] = useState<WorkspacePermissions>({
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false
  });

  // Bulk Edit States
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  // File Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalVideo, setUploadModalVideo] = useState<Video | null>(null);

  // Table Settings & Views States
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showViewCreateModal, setShowViewCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<WorkspaceView | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Table Settings Hook (lädt Settings des Workspace-Owners!)
  const {
    settings: tableSettings,
    updateColumnOrder,
    updateColumnWidth,
    toggleColumnVisibility,
    resetSettings
  } = useTableSettings({
    userId: user?.id,
    workspaceOwnerId: ownerId, // Wichtig: Owner-Settings verwenden
    context: 'workspace_videos'
  });

  // Workspace Views Hook
  const {
    views: workspaceViews,
    createView,
    updateView,
    deleteView,
    setDefaultView
  } = useWorkspaceViews(ownerId);

  // Spalten-Konfiguration basierend auf Settings
  // Wenn aktive Ansicht vorhanden und column_settings hat, verwende diese
  const activeView = workspaceViews.find(v => v.id === activeViewId);
  const columnOrder = activeView?.column_settings?.order && activeView.column_settings.order.length > 0
    ? activeView.column_settings.order
    : (tableSettings?.column_order && tableSettings.column_order.length > 0
      ? tableSettings.column_order
      : DEFAULT_COLUMNS.map(col => col.id));

  const hiddenColumns = activeView?.column_settings?.hidden || tableSettings?.hidden_columns || [];
  const columnWidths = activeView?.column_settings?.widths || tableSettings?.column_widths || {};

  // Visible columns in correct order (used for tbody rendering below)
  const visibleColumns = React.useMemo(() => getVisibleColumnOrder(
    isBulkEditMode 
      ? [{ id: 'checkbox', label: '', fixed: true, resizable: false }, ...DEFAULT_COLUMNS]
      : DEFAULT_COLUMNS,
    isBulkEditMode 
      ? ['checkbox', ...columnOrder]
      : columnOrder,
    hiddenColumns
  ), [isBulkEditMode, columnOrder, hiddenColumns, activeViewId]);
  
  // Log for debugging
  React.useEffect(() => {
    console.log('[Workspace Table] Visible columns:', visibleColumns.map(c => c.id));
  }, [visibleColumns]);

  // Toast helpers
  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Check authentication
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Get workspace info and permissions
  useEffect(() => {
    const fetchOwnerInfo = async () => {
      if (!workspacesLoading && sharedWorkspaces.length > 0) {
        const workspace = sharedWorkspaces.find(w => w.workspace_owner_id === ownerId);
        if (workspace) {
          setWorkspaceOwnerName(workspace.owner_name);
          setPermissions(workspace.permissions);
          
          // Fetch owner user_metadata for firstname/lastname
          const { supabase } = await import('@/utils/supabase');
          try {
            // Try to get owner details via RPC
            const { data: ownerData, error } = await supabase
              .rpc('get_workspace_owner_details', { owner_ids: [ownerId] });
            
            if (!error && ownerData && ownerData.length > 0) {
              const owner = ownerData[0];
              setWorkspaceOwnerInfo({
                firstname: owner.firstname || '',
                lastname: owner.lastname || '',
                email: owner.email || workspace.owner_email
              });
            } else {
              // Fallback: Parse owner_name into firstname/lastname
              const nameParts = workspace.owner_name.split(' ');
              if (nameParts.length > 1) {
                setWorkspaceOwnerInfo({
                  firstname: nameParts[0],
                  lastname: nameParts.slice(1).join(' '),
                  email: workspace.owner_email
                });
              }
            }
          } catch (err) {
            console.error('[SharedWorkspacePage] Error fetching owner info:', err);
            // Use parsed name as fallback
            const nameParts = workspace.owner_name.split(' ');
            if (nameParts.length > 1) {
              setWorkspaceOwnerInfo({
                firstname: nameParts[0],
                lastname: nameParts.slice(1).join(' '),
                email: workspace.owner_email
              });
            }
          }
        } else {
          // User doesn't have access to this workspace
          router.push('/dashboard');
        }
      }
    };
    
    fetchOwnerInfo();
  }, [workspacesLoading, sharedWorkspaces, ownerId, router]);

  // Fetch workspace members for the shared workspace
  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      if (!ownerId) return;
      
      const { supabase } = await import('@/utils/supabase');
      try {
        console.log('[SharedWorkspacePage] Fetching workspace members for owner:', ownerId);
        
        // Fetch all active members of this workspace (including owner and collaborators)
        const { data, error } = await supabase
          .from('workspace_members')
          .select(`
            id,
            user_id,
            role,
            user:user_id (
              email,
              firstname,
              lastname
            )
          `)
          .eq('workspace_owner_id', ownerId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('[SharedWorkspacePage] Error fetching workspace members:', error);
          return;
        }
        
        console.log('[SharedWorkspacePage] 📊 Raw workspace members data:', data);
        console.log('[SharedWorkspacePage] 📊 Data length:', data?.length);
        
        // Transform data: user can be array or object depending on Supabase version
        const transformedMembers = (data || []).map((member) => {
          console.log('[SharedWorkspacePage] 🔍 Processing member:', member);
          console.log('[SharedWorkspacePage] 🔍 Member user type:', typeof member.user, Array.isArray(member.user) ? 'is array' : 'is not array');
          
          // Handle both array and object formats
          let userData: { email: string; firstname?: string; lastname?: string } | undefined;
          if (Array.isArray(member.user) && member.user.length > 0) {
            userData = member.user[0] as { email: string; firstname?: string; lastname?: string };
          } else if (member.user && typeof member.user === 'object' && !Array.isArray(member.user)) {
            userData = member.user as { email: string; firstname?: string; lastname?: string };
          }
          
          console.log('[SharedWorkspacePage] 🔍 Extracted user data:', userData);
          
          return {
            id: member.id as string,
            user: userData ? {
              email: userData.email,
              firstname: userData.firstname,
              lastname: userData.lastname,
            } : undefined
          };
        });
        
        console.log('[SharedWorkspacePage] ✅ Transformed members:', transformedMembers);
        console.log('[SharedWorkspacePage] ✅ Members with valid user data:', transformedMembers.filter(m => m.user).length);
        
        setWorkspaceMembers(transformedMembers);
      } catch (err) {
        console.error('[SharedWorkspacePage] Error in fetchWorkspaceMembers:', err);
      }
    };
    
    fetchWorkspaceMembers();
  }, [ownerId]);

  // Handler für Inline-Editing - Generischer Save Handler mit Bulk-Support
  const handleFieldSave = async (videoId: string, field: string, value: string) => {
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, dieses Video zu bearbeiten'
      });
      return;
    }

    // Check if this video is selected and bulk mode is active
    const shouldBulkUpdate = isBulkEditMode && selectedVideoIds.size > 0 && selectedVideoIds.has(videoId);
    const videosToUpdate = shouldBulkUpdate ? Array.from(selectedVideoIds) : [videoId];

    try {
      if (videosToUpdate.length > 1) {
        // Bulk update
        await bulkUpdateWorkspaceVideosAsync({
          videoIds: videosToUpdate,
          updates: {
            [field]: value || null
          },
          ownerId
        });
        
        const fieldLabels: Record<string, string> = {
          status: 'Status',
          description: 'Beschreibung',
          publication_date: 'Veröffentlichungsdatum',
          responsible_person: 'Verantwortliche Person',
          inspiration_source: 'Inspiration Quelle'
        };
        
        addToast({
          type: 'success',
          title: `${videosToUpdate.length} Videos aktualisiert`,
          message: `${fieldLabels[field] || field} wurde geändert`,
          duration: 3000
        });
      } else {
        // Single update
        await updateWorkspaceVideoAsync({
          id: videoId,
          updates: {
            [field]: value || null
          },
          ownerId
        });
        
        addToast({
          type: 'success',
          title: 'Gespeichert',
          message: 'Änderung wurde erfolgreich gespeichert',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error saving field:', error);
      addToast({
        type: 'error',
        title: 'Fehler beim Speichern',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  };

  // Filter videos by search term
  // Get active view filters (activeView ist bereits oben definiert)
  const viewFilters = activeView?.filters || {};

  const filteredVideos = videos.filter(video => {
    // Search filter
    const videoName = video.name || video.title || '';
    const matchesSearch = (
      videoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // View filters
    let matchesViewFilters = true;
    if (activeViewId && Object.keys(viewFilters).length > 0) {
      for (const [key, value] of Object.entries(viewFilters)) {
        if (value === null || value === undefined || value === '') continue;
        
        // Status filter
        if (key === 'status' && video.status !== value) {
          matchesViewFilters = false;
          break;
        }
        // Responsible person filter
        if (key === 'responsible_person' && video.responsible_person !== value) {
          matchesViewFilters = false;
          break;
        }
        // Add more filter types as needed
      }
    }

    return matchesSearch && matchesViewFilters;
  });

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
        return { icon: VideoIcon, color: 'text-neutral-400' };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Gerade eben';
      if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
      if (diffHours < 24) return `vor ${diffHours} Std.`;
      if (diffDays < 4) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
      
      // Ab 4 Tagen: Datum anzeigen
      return formatDate(dateString);
    } catch {
      return '-';
    }
  };

  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, Videos zu bearbeiten'
      });
      return;
    }

    // Check if this video is selected and bulk mode is active
    const shouldBulkUpdate = isBulkEditMode && selectedVideoIds.size > 0 && selectedVideoIds.has(videoId);
    const videosToUpdate = shouldBulkUpdate ? Array.from(selectedVideoIds) : [videoId];

    try {
      if (videosToUpdate.length > 1) {
        // Bulk update
        await bulkUpdateWorkspaceVideosAsync({
          videoIds: videosToUpdate,
          updates: { status: newStatus },
          ownerId
        });
        
        addToast({
          type: 'success',
          title: `${videosToUpdate.length} Videos aktualisiert`,
          message: `Status wurde auf "${newStatus}" geändert`,
          duration: 3000
        });
      } else {
        // Single update
        updateWorkspaceVideo({
          id: videoId,
          updates: { status: newStatus },
          ownerId
        });
        
        console.log('Status erfolgreich aktualisiert!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({
        type: 'error',
        title: 'Status-Update fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  };

  const handleDeleteVideo = (video: Video) => {
    if (!permissions.can_delete) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, Videos zu löschen'
      });
      return;
    }
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete || !permissions.can_delete) return;

    try {
      deleteWorkspaceVideo({ id: videoToDelete.id, ownerId });
      
      setShowDeleteModal(false);
      setVideoToDelete(null);
      
      addToast({
        type: 'success',
        title: 'Video gelöscht',
        message: `"${videoToDelete.name || videoToDelete.title || 'Video'}" wurde erfolgreich gelöscht`
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      addToast({
        type: 'error',
        title: 'Video-Löschung fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  };

  // Bulk Edit Handlers
  const handleToggleBulkMode = () => {
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, Videos zu bearbeiten'
      });
      return;
    }
    
    setIsBulkEditMode(!isBulkEditMode);
    if (isBulkEditMode) {
      // Wenn Bulk Mode deaktiviert wird, alle Auswahlen löschen
      setSelectedVideoIds(new Set());
    }
  };

  const handleVideoSelection = (videoId: string, isSelected: boolean) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(videoId);
      } else {
        newSet.delete(videoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allVideoIds = new Set(filteredVideos.map(v => v.id));
    setSelectedVideoIds(allVideoIds);
  };

  const handleDeselectAll = () => {
    setSelectedVideoIds(new Set());
  };

  const handleRowClick = (e: React.MouseEvent, videoId: string) => {
    // Nur wenn Bulk-Edit-Mode aktiv ist UND Strg/Cmd gedrückt ist
    if (isBulkEditMode && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const isSelected = selectedVideoIds.has(videoId);
      handleVideoSelection(videoId, !isSelected);
    }
  };

  // ESC-Taste zum Aufheben der Bulk-Auswahl
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBulkEditMode) {
        setIsBulkEditMode(false);
        setSelectedVideoIds(new Set());
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isBulkEditMode]);

  // File Upload Modal Handlers
  const handleOpenUploadModal = async (video: Video) => {
    // Vor dem Öffnen: Aktuellste Daten aus Supabase holen
    console.log('[Workspace Upload] Syncing video data before opening upload modal...');
    const { data: refetchedVideos } = await refetch();
    
    // Finde das aktualisierte Video
    const updatedVideo = refetchedVideos?.find(v => v.id === video.id) || video;
    
    console.log('[Workspace Upload] Video data synced:', {
      oldNextcloudPath: video.nextcloud_path,
      newNextcloudPath: updatedVideo.nextcloud_path,
      oldStorageLocation: video.storage_location,
      newStorageLocation: updatedVideo.storage_location
    });
    
    if (!updatedVideo.nextcloud_path || !updatedVideo.storage_location) {
      addToast({
        type: 'warning',
        title: 'Upload noch nicht bereit',
        message: 'Der Video-Ordner wird gerade erstellt. Bitte versuche es in wenigen Sekunden erneut.'
      });
      return;
    }
    
    setUploadModalVideo(updatedVideo);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalVideo(null);
  };

  // Storage Location Handler mit Sync
  const handleOpenStorageLocation = async (video: Video) => {
    // Vor dem Öffnen: Aktuellste Daten aus Supabase holen
    console.log('[Workspace Storage] Syncing video data before opening storage location...');
    const { data: refetchedVideos } = await refetch();
    
    // Finde das aktualisierte Video
    const updatedVideo = refetchedVideos?.find(v => v.id === video.id) || video;
    
    console.log('[Workspace Storage] Video data synced:', {
      oldStorageLocation: video.storage_location,
      newStorageLocation: updatedVideo.storage_location
    });
    
    if (updatedVideo.storage_location) {
      window.open(updatedVideo.storage_location, '_blank', 'noopener,noreferrer');
    } else {
      addToast({
        type: 'warning',
        title: 'Speicherort noch nicht bereit',
        message: 'Der Video-Ordner wird gerade erstellt. Bitte versuche es in wenigen Sekunden erneut.'
      });
    }
  };

  // View Handlers
  const handleViewChange = async (viewId: string | null) => {
    setActiveViewId(viewId);
    
    // Lade Spalteneinstellungen der neuen Ansicht
    if (viewId) {
      const view = workspaceViews.find(v => v.id === viewId);
      if (view?.column_settings) {
        // Lade column_settings aus der View
        if (view.column_settings.order && view.column_settings.order.length > 0) {
          await updateColumnOrder(view.column_settings.order);
        }
        if (view.column_settings.hidden && view.column_settings.hidden.length > 0) {
          // Update hidden columns
          for (const columnId of view.column_settings.hidden) {
            await toggleColumnVisibility(columnId);
          }
        }
        
        addToast({
          type: 'success',
          title: 'Ansicht geladen',
          message: `Spalteneinstellungen von "${view.name}" wurden geladen.`,
          duration: 2000
        });
      }
    }
  };

  const handleCreateView = () => {
    setEditingView(null);
    setShowViewCreateModal(true);
  };

  const handleEditView = (view: WorkspaceView) => {
    setEditingView(view);
    setShowViewCreateModal(true);
  };

  const handleSaveView = async (viewData: {
    name: string;
    filters: Record<string, string | number | boolean | null>;
    sort_config?: { field: string; direction: 'asc' | 'desc' };
  }) => {
    try {
      if (editingView) {
        await updateView({ id: editingView.id, updates: viewData });
        addToast({
          type: 'success',
          title: 'Ansicht aktualisiert',
          message: `"${viewData.name}" wurde erfolgreich aktualisiert.`
        });
      } else {
        await createView(viewData);
        addToast({
          type: 'success',
          title: 'Ansicht erstellt',
          message: `"${viewData.name}" wurde erfolgreich erstellt.`
        });
      }
    } catch (error) {
      console.error('Error saving view:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Ansicht konnte nicht gespeichert werden.'
      });
      throw error;
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await deleteView(viewId);
      if (activeViewId === viewId) {
        setActiveViewId(null);
      }
      addToast({
        type: 'success',
        title: 'Ansicht gelöscht',
        message: 'Die Ansicht wurde erfolgreich gelöscht.'
      });
    } catch (error) {
      console.error('Error deleting view:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Ansicht konnte nicht gelöscht werden.'
      });
    }
  };

  const handleSetDefaultView = async (viewId: string | null) => {
    try {
      await setDefaultView(viewId);
      addToast({
        type: 'success',
        title: 'Standard-Ansicht gesetzt',
        message: viewId ? 'Die Ansicht wurde als Standard festgelegt.' : 'Standard-Ansicht wurde entfernt.'
      });
    } catch (error) {
      console.error('Error setting default view:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Standard-Ansicht konnte nicht gesetzt werden.'
      });
    }
  };

  // Column Settings Handlers
  const handleColumnOrderChange = async (newOrder: string[]) => {
    try {
      // Wenn aktive Ansicht vorhanden, speichere in der Ansicht
      if (activeViewId) {
        const view = workspaceViews.find(v => v.id === activeViewId);
        if (view) {
          await updateView({
            id: activeViewId,
            updates: {
              column_settings: {
                order: newOrder,
                widths: view.column_settings?.widths || {},
                hidden: view.column_settings?.hidden || []
              }
            }
          });
          
          addToast({
            type: 'success',
            title: 'Ansicht gespeichert',
            message: `Spaltenreihenfolge in "${view.name}" gespeichert.`,
            duration: 2000
          });
        }
      } else {
        // Ansonsten in user_table_settings speichern
        await updateColumnOrder(newOrder);
      }
    } catch (error) {
      console.error('Error updating column order:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Spaltenreihenfolge konnte nicht gespeichert werden.'
      });
    }
  };

  const handleToggleColumnVisibility = async (columnId: string) => {
    try {
      // Wenn aktive Ansicht vorhanden, speichere in der Ansicht
      if (activeViewId) {
        const view = workspaceViews.find(v => v.id === activeViewId);
        if (view) {
          const currentHidden = view.column_settings?.hidden || [];
          const newHidden = currentHidden.includes(columnId)
            ? currentHidden.filter(id => id !== columnId)
            : [...currentHidden, columnId];
          
          await updateView({
            id: activeViewId,
            updates: {
              column_settings: {
                order: view.column_settings?.order || [],
                widths: view.column_settings?.widths || {},
                hidden: newHidden
              }
            }
          });
          
          addToast({
            type: 'success',
            title: 'Ansicht gespeichert',
            message: `Spaltensichtbarkeit in "${view.name}" gespeichert.`,
            duration: 2000
          });
        }
      } else {
        // Ansonsten in user_table_settings speichern
        await toggleColumnVisibility(columnId);
      }
    } catch (error) {
      console.error('Error toggling column visibility:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Spaltensichtbarkeit konnte nicht gespeichert werden.'
      });
    }
  };

  const handleResetColumns = async () => {
    try {
      await resetSettings();
      addToast({
        type: 'success',
        title: 'Spalten zurückgesetzt',
        message: 'Die Spalten-Einstellungen wurden auf Standard zurückgesetzt.'
      });
    } catch (error) {
      console.error('Error resetting columns:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Spalten konnten nicht zurückgesetzt werden.'
      });
    }
  };

  // Debounced Column Resize Handler
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleColumnResize = (columnId: string, width: number) => {
    // Clear previous timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce: Save after 500ms of no changes
    resizeTimeoutRef.current = setTimeout(async () => {
      try {
        // Wenn aktive Ansicht vorhanden, speichere in der Ansicht
        if (activeViewId) {
          const view = workspaceViews.find(v => v.id === activeViewId);
          if (view) {
            await updateView({
              id: activeViewId,
              updates: {
                column_settings: {
                  order: view.column_settings?.order || [],
                  widths: { ...view.column_settings?.widths, [columnId]: width },
                  hidden: view.column_settings?.hidden || []
                }
              }
            });
            
            addToast({
              type: 'success',
              title: 'Ansicht gespeichert',
              message: `Spaltenbreite in "${view.name}" gespeichert.`,
              duration: 2000
            });
          }
        } else {
          // Ansonsten in user_table_settings speichern
          await updateColumnWidth(columnId, width);
        }
      } catch (error) {
        console.error('Error updating column width:', error);
      }
    }, 500);
  };

  // Dynamic sidebar items
  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', active: false },
    { name: 'Videos', icon: VideoIcon, href: '/dashboard/videos', active: false },
    ...sharedWorkspaces.map(workspace => {
      // Format owner name: prioritize firstname + lastname, fallback to email first part
      let displayName = workspace.owner_name;
      if (displayName.includes('@')) {
        // If it's an email, just use the part before @
        displayName = displayName.split('@')[0];
      }
      
      return {
        name: displayName, // Just the name, without "Workspace:" prefix
        icon: Users,
        href: `/dashboard/workspace/${workspace.workspace_owner_id}`,
        active: workspace.workspace_owner_id === ownerId
      };
    })
  ];

  const sidebarBottomItems = [
    { name: 'Settings', icon: Settings, href: '/profile', active: false }
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Cell Rendering Function - Maps column IDs to their respective cell content
  // Must be defined AFTER all handler functions it depends on
  const renderCell = React.useCallback((columnId: string, video: Video) => {
    const statusInfo = getStatusIcon(video.status);
    const StatusIcon = statusInfo.icon;

    switch (columnId) {
      case 'checkbox':
        return (
          <td key={`${video.id}-checkbox`} className="py-4 px-4">
            <input
              type="checkbox"
              checked={selectedVideoIds.has(video.id)}
              onChange={(e) => {
                e.stopPropagation();
                handleVideoSelection(video.id, e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
          </td>
        );

      case 'title':
        return (
          <td key={`${video.id}-title`} className="py-4 px-4">
            <div className="flex items-center">
              <div className={`p-2 bg-neutral-800 rounded-lg mr-3`}>
                <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
              </div>
              <div>
                <p className="text-white font-medium">{video.name}</p>
              </div>
            </div>
          </td>
        );

      case 'status':
        return (
          <td key={`${video.id}-status`} className="py-4 px-4">
            {permissions.can_edit ? (
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
                <StatusIcon className={`w-4 h-4 mr-2 ${statusInfo.color}`} />
                <span className="text-neutral-400 text-sm">{video.status}</span>
              </div>
            )}
          </td>
        );

      case 'publication_date':
        return (
          <td key={`${video.id}-publication_date`} className="py-4 px-4">
            <EditableDate
              value={video.publication_date}
              videoId={video.id}
              onSave={handleFieldSave}
              editable={permissions.can_edit}
              placeholder="Datum wählen"
            />
          </td>
        );

      case 'responsible_person':
        return (
          <td key={`${video.id}-responsible_person`} className="py-4 px-4">
            <EditableResponsiblePerson
              value={video.responsible_person}
              videoId={video.id}
              onSave={async (videoId, field, value) => {
                await handleFieldSave(videoId, field, value);
              }}
              editable={permissions.can_edit}
              workspaceOwner={workspaceOwnerInfo}
              workspaceMembers={workspaceMembers}
            />
          </td>
        );

      case 'upload':
        return (
          <td key={`${video.id}-upload`} className="py-4 px-4">
            {permissions.can_edit && (
              video.storage_location ? (
                <button
                  onClick={() => handleOpenUploadModal(video)}
                  className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 hover:border-blue-500/40"
                  title="Dateien hochladen"
                >
                  <Upload className="h-5 w-5" />
                </button>
              ) : (
                <Tooltip 
                  content="Der Speicherort wird noch erstellt und wird in Kürze (max. 5 Minuten) verfügbar sein. Bitte um Geduld. Sollte die Funktion nicht verfügbar sein, bitte Kontakt aufnehmen."
                  position="top"
                  maxWidth="300px"
                >
                  <button
                    disabled
                    className="p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20"
                  >
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </button>
                </Tooltip>
              )
            )}
          </td>
        );

      case 'storage_location':
        return (
          <td key={`${video.id}-storage_location`} className="py-4 px-4">
            {video.storage_location ? (
              <button
                onClick={() => handleOpenStorageLocation(video)}
                className="p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors inline-flex items-center"
                title="Ordner durchsuchen"
              >
                <FolderOpen className="h-5 w-5" />
              </button>
            ) : (
              <span className="text-neutral-500 text-sm">-</span>
            )}
          </td>
        );

      case 'updated_at':
        return (
          <td key={`${video.id}-updated_at`} className="py-4 px-4 text-neutral-300 text-sm">
            {formatRelativeTime(video.updated_at)}
          </td>
        );

      case 'description':
        return (
          <td key={`${video.id}-description`} className="py-4 px-4 max-w-xs">
            <EditableDescription
              value={video.description}
              videoId={video.id}
              onSave={handleFieldSave}
              editable={permissions.can_edit}
              placeholder="Beschreibung hinzufügen"
            />
          </td>
        );

      case 'actions':
        return (
          <td key={`${video.id}-actions`} className="py-4 px-4">
            <div className="flex items-center space-x-2">
              {permissions.can_delete && (
                <button
                  onClick={() => handleDeleteVideo(video)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Video löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        );

      default:
        return <td key={`${video.id}-${columnId}`} className="py-4 px-4"></td>;
    }
  }, [
    selectedVideoIds,
    permissions,
    workspaceOwnerInfo,
    workspaceMembers,
    handleVideoSelection,
    handleUpdateStatus,
    handleFieldSave,
    handleOpenUploadModal,
    handleOpenStorageLocation,
    handleDeleteVideo
  ]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? '80px' : '240px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`hidden md:flex flex-col bg-neutral-900/50 backdrop-blur-md border-r border-neutral-800 relative ${sidebarCollapsed ? 'items-center' : ''}`}
      >
        {/* Logo */}
        <div className={`p-6 flex items-center border-b border-neutral-800 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!sidebarCollapsed && (
            <div className="flex-1">
              <Image
                src="/kosmamedia-logo.svg"
                alt="Logo"
                width={120}
                height={40}
                className="brightness-0 invert"
                priority
              />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-white text-black font-medium' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={item.name}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0`} />
              {!sidebarCollapsed && <span className="truncate" title={item.name}>{item.name}</span>}
            </button>
          ))}
        </nav>

        {/* Bottom Items */}
        <div className="p-4 border-t border-neutral-800 space-y-2">
          {sidebarBottomItems.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-white text-black font-medium' 
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              } ${sidebarCollapsed ? 'justify-center' : ''}`}
              title={sidebarCollapsed ? item.name : ''}
            >
              <item.icon className="w-5 h-5" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </button>
          ))}
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute left-0 top-0 bottom-0 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col"
          >
            {/* Mobile Logo & Close */}
            <div className="p-4 flex items-center justify-between border-b border-neutral-800">
              <Image
                src="/kosmamedia-logo.svg"
                alt="Logo"
                width={120}
                height={40}
                className="brightness-0 invert"
              />
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-neutral-800 rounded-lg">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {sidebarItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    item.active 
                      ? 'bg-white text-black font-medium' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>

            {/* Mobile Bottom Items */}
            <div className="p-4 border-t border-neutral-800 space-y-2">
              {sidebarBottomItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    item.active 
                      ? 'bg-white text-black font-medium' 
                      : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? '0' : '0' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Top Bar - Same structure as Videos page */}
        <nav className="bg-black border-b border-neutral-800 px-4 py-3">
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
              <div className="hidden md:flex md:ml-8 md:items-center md:gap-3">
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
                        <p className="text-xs text-neutral-400 mt-1">Angemeldet</p>
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

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {/* Header with Permissions Info and Create Button */}
          <div className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Geteilte Videos</h2>
                <div className="flex flex-wrap gap-2">
                  {permissions.can_view && (
                    <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full">
                      Ansehen
                    </span>
                  )}
                  {permissions.can_create && (
                    <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-full">
                      Erstellen
                    </span>
                  )}
                  {permissions.can_edit && (
                    <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      Bearbeiten
                    </span>
                  )}
                  {permissions.can_delete && (
                    <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-full">
                      Löschen
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Spalten-Einstellungen Button */}
                <button
                  onClick={() => setShowColumnsModal(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-300 font-medium text-sm sm:text-base bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-neutral-600"
                >
                  <Settings className="w-5 h-5" />
                  <span className="hidden sm:inline">Spalten</span>
                </button>

                {/* Mehrfachbearbeitung Button (nur wenn can_edit) */}
                {permissions.can_edit && (
                  <button
                    onClick={handleToggleBulkMode}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all duration-300 font-medium text-sm sm:text-base ${
                      isBulkEditMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    {isBulkEditMode ? <CheckSquare className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    <span className="hidden sm:inline">{isBulkEditMode ? 'Bearbeitung aktiv' : 'Mehrfachbearbeitung'}</span>
                    <span className="sm:hidden">{isBulkEditMode ? 'Aktiv' : 'Mehrfach'}</span>
                  </button>
                )}

                {/* Create Video Button */}
                {permissions.can_create && (
                  <button
                    onClick={() => alert('Video-Erstellung für geteilte Workspaces kommt in Kürze!')}
                    className="bg-white hover:bg-neutral-100 text-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl flex items-center space-x-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] font-medium text-sm sm:text-base"
                  >
                    <span className="text-xl sm:text-2xl">+</span>
                    <span className="hidden sm:inline">Neues Video</span>
                    <span className="sm:hidden">Video hinzufügen</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Description */}
          <div className="mb-6 bg-neutral-900/30 border border-neutral-700/50 rounded-2xl p-4">
            <p className="text-neutral-400 text-sm leading-relaxed">
              <span className="font-medium text-neutral-300">Geteilter Workspace:</span> Hier befinden sich alle Videos aus dem Workspace von <span className="font-medium text-white">{workspaceOwnerName}</span>. Sie können Videos gemäß Ihrer zugewiesenen Berechtigungen verwalten.
            </p>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mb-4">
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

          {/* Videos Table */}
          {showSkeleton ? (
            <VideoTableSkeleton />
          ) : (
            <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Alle Videos ({filteredVideos.length})</h3>
                {isFetching && !isLoading && (
                  <div className="flex items-center text-neutral-400 text-sm">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Aktualisiere...
                  </div>
                )}
              </div>

              {/* View Tabs */}
              <ViewTabs
                activeViewId={activeViewId}
                views={workspaceViews}
                onViewChange={handleViewChange}
                onCreateView={handleCreateView}
                onEditView={handleEditView}
                onDeleteView={handleDeleteView}
                onSetDefault={handleSetDefaultView}
                canManageViews={permissions.can_create}
              />

              {filteredVideos.length === 0 ? (
                <div className="text-center py-12">
                  <VideoIcon className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {searchTerm ? 'Keine Videos gefunden' : 'Noch keine Videos'}
                  </h3>
                  <p className="text-neutral-400">
                    {searchTerm 
                      ? `Keine Videos gefunden für "${searchTerm}".`
                      : 'In diesem Workspace sind noch keine Videos vorhanden.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-800/50">
                        <DraggableTableHeader
                          columns={isBulkEditMode 
                            ? [{ id: 'checkbox', label: '', fixed: true, resizable: false }, ...DEFAULT_COLUMNS]
                            : DEFAULT_COLUMNS
                          }
                          columnOrder={isBulkEditMode 
                            ? ['checkbox', ...columnOrder]
                            : columnOrder
                          }
                          hiddenColumns={hiddenColumns}
                          onColumnOrderChange={(newOrder) => {
                            // Remove checkbox from order if present
                            const orderWithoutCheckbox = newOrder.filter(id => id !== 'checkbox');
                            handleColumnOrderChange(orderWithoutCheckbox);
                          }}
                          onColumnResize={handleColumnResize}
                          columnWidths={columnWidths}
                        >
                          {(column) => (
                            <>
                              {column.id === 'checkbox' && isBulkEditMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedVideoIds.size === filteredVideos.length && filteredVideos.length > 0}
                                  onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                />
                              )}
                              {column.id !== 'checkbox' && column.label}
                            </>
                          )}
                        </DraggableTableHeader>
                      </thead>
                      <tbody>
                        {filteredVideos.map((video) => (
                          <tr 
                            key={video.id} 
                            className={`border-b border-neutral-800 hover:bg-neutral-800/30 ${isBulkEditMode ? 'cursor-pointer' : ''} ${selectedVideoIds.has(video.id) ? 'border-l-4 border-l-blue-500 bg-blue-500/5' : ''} transition-all duration-200`}
                            onClick={(e) => handleRowClick(e, video.id)}
                          >
                            {/* Render cells dynamically based on visible columns */}
                            {visibleColumns.map((column) => renderCell(column.id, video))}
                          </tr>
                        ))}
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
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center flex-1 min-w-0">
                              <div className="p-2 bg-neutral-800 rounded-lg mr-3 flex-shrink-0">
                                <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                              </div>
                              <h3 className="text-white font-medium truncate">{video.name}</h3>
                            </div>
                            <div className="flex items-center space-x-2 ml-2">
                              {permissions.can_delete && (
                                <button
                                  onClick={() => handleDeleteVideo(video)}
                                  className="p-1 text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">Status</label>
                            {permissions.can_edit ? (
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
                              <div className="flex items-center px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-xl">
                                <StatusIcon className={`w-4 h-4 mr-2 ${statusInfo.color}`} />
                                <span className="text-neutral-300 text-sm">{video.status}</span>
                              </div>
                            )}
                          </div>

                          {/* Other Details */}
                          <div className="space-y-3 text-sm">
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Veröffentlichung</label>
                              <EditableDate
                                value={video.publication_date}
                                videoId={video.id}
                                onSave={handleFieldSave}
                                editable={permissions.can_edit}
                                placeholder="Datum wählen"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Verantwortlich</label>
                              <ResponsiblePersonAvatar 
                                responsiblePerson={video.responsible_person} 
                                size="sm" 
                                showFullName={true}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Dateien hochladen</label>
                              {permissions.can_edit && (
                                video.storage_location ? (
                                  <button
                                    onClick={() => handleOpenUploadModal(video)}
                                    className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20"
                                    title="Dateien hochladen"
                                  >
                                    <Upload className="h-5 w-5" />
                                  </button>
                                ) : (
                                  <Tooltip 
                                    content="Der Speicherort wird noch erstellt und wird in Kürze (max. 5 Minuten) verfügbar sein. Bitte um Geduld. Sollte die Funktion nicht verfügbar sein, bitte Kontakt aufnehmen."
                                    position="top"
                                    maxWidth="300px"
                                  >
                                    <button
                                      disabled
                                      className="p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20"
                                    >
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    </button>
                                  </Tooltip>
                                )
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Speicherort</label>
                              {video.storage_location ? (
                                <button
                                  onClick={() => handleOpenStorageLocation(video)}
                                  className="p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors inline-flex items-center"
                                  title="Ordner durchsuchen"
                                >
                                  <FolderOpen className="h-5 w-5" />
                                </button>
                              ) : (
                                <p className="text-neutral-300">-</p>
                              )}
                            </div>
                            {video.updated_at && (
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Aktualisiert:</span>
                                <span className="text-white">{formatRelativeTime(video.updated_at)}</span>
                              </div>
                            )}
                            <div>
                              <label className="block text-xs font-medium text-neutral-400 mb-1">Beschreibung</label>
                              <EditableDescription
                                value={video.description}
                                videoId={video.id}
                                onSave={handleFieldSave}
                                editable={permissions.can_edit}
                                placeholder="Beschreibung hinzufügen"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setVideoToDelete(null);
          }}
          onConfirm={confirmDeleteVideo}
          title="Video löschen?"
          message="Möchten Sie dieses Video wirklich unwiderruflich löschen?"
          itemName={videoToDelete?.name}
        />
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          title={errorDetails.title}
          message={errorDetails.message}
          details={errorDetails.details}
        />
      )}

      {/* Bulk Edit Bar */}
      <AnimatePresence>
        {isBulkEditMode && selectedVideoIds.size > 0 && (
          <BulkEditBar
            selectedCount={selectedVideoIds.size}
            totalCount={filteredVideos.length}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onCancel={handleToggleBulkMode}
          />
        )}
      </AnimatePresence>

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={handleCloseUploadModal}
        videoId={uploadModalVideo?.id || ''}
        videoName={uploadModalVideo?.name || ''}
        storageLocation={uploadModalVideo?.storage_location}
        nextcloudPath={uploadModalVideo?.nextcloud_path}
        onUploadSuccess={(fileNames) => {
          addToast({
            type: 'success',
            title: `${fileNames.length} Datei(en) erfolgreich hochgeladen`,
            message: fileNames.join(', '),
            duration: 5000
          });
        }}
        onUploadError={() => {
          addToast({
            type: 'error',
            title: 'Upload der Datei fehlgeschlagen',
            message: 'Bitte versuche es in einem Moment erneut. Nach Änderungen an den Video-Feldern kann es einen Moment dauern, bis der Upload wieder funktioniert.',
            duration: 6000
          });
        }}
      />

      {/* Table Columns Settings Modal */}
      <TableColumnsSettings
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={DEFAULT_COLUMNS}
        columnOrder={columnOrder}
        hiddenColumns={hiddenColumns}
        onColumnOrderChange={handleColumnOrderChange}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        onReset={handleResetColumns}
      />

      {/* View Create/Edit Modal */}
      <ViewCreateModal
        isOpen={showViewCreateModal}
        onClose={() => {
          setShowViewCreateModal(false);
          setEditingView(null);
        }}
        onSave={handleSaveView}
        editView={editingView}
        currentFilters={{ search: searchTerm }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

