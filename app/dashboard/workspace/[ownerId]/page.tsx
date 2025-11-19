'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
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
import EditableCell from '@/components/EditableCell';
import EditableDescription from '@/components/EditableDescription';
import EditableDate from '@/components/EditableDate';
import { TipTapEditor } from '@/components/TipTapEditor';
import EditableResponsiblePerson from '@/components/EditableResponsiblePerson';
import ResponsiblePersonAvatar from '@/components/ResponsiblePersonAvatar';
import ResponsiblePersonDropdownSimple from '@/components/ResponsiblePersonDropdownSimple';
import { useResponsiblePeople } from '@/hooks/useResponsiblePeople';
import { ToastContainer, ToastProps } from '@/components/Toast';
import BulkEditBar from '@/components/BulkEditBar';
import { FileUploadModal } from '@/components/FileUploadModal';
import { VideoPreviewPlayer } from '@/components/VideoPreviewPlayer';
import { Tooltip } from '@/components/Tooltip';
import { TableColumnsSettings, type ColumnConfig } from '@/components/TableColumnsSettings';
import { ViewTabs } from '@/components/ViewTabs';
import { ViewCreateModal } from '@/components/ViewCreateModal';
import { DraggableTableHeader, getVisibleColumnOrder } from '@/components/DraggableTableHeader';
import { useTableSettings } from '@/hooks/useTableSettings';
import { useWorkspaceViews, type WorkspaceView, type SortConfig, type FilterValue } from '@/hooks/useWorkspaceViews';
import { ColumnHeaderDropdown, type ColumnType } from '@/components/ColumnHeaderDropdown';
import { FilterSubmenu, type FilterType } from '@/components/FilterSubmenu';
import { ActiveFiltersBar } from '@/components/ActiveFiltersBar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video as VideoIcon, 
  Settings, 
  Plus,
  Menu,
  X,
  Search,
  User,
  Edit,
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

// Custom Hook für Sticky Header - Optimiert mit Throttling
function useStickyHeader(offset = 100) {
  const [isSticky, setIsSticky] = useState(false);
  
  const handleScroll = React.useCallback(() => {
    const shouldBeSticky = window.scrollY > offset;
    // Nur State updaten wenn sich der Wert ändert (verhindert unnötige Re-renders)
    setIsSticky(prev => prev !== shouldBeSticky ? shouldBeSticky : prev);
  }, [offset]);
  
  useEffect(() => {
    // Passive Event Listener für bessere Scroll-Performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);
  
  return isSticky;
}

const sidebarBottomItems = [
  {
    name: 'Settings',
    icon: Settings,
    href: '/profile',
    active: false
  }
];

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
  { id: 'updated_at', label: 'Aktualisiert', resizable: true },
  { id: 'actions', label: 'Aktionen', fixed: true, resizable: false }
];

export default function SharedWorkspacePage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ownerId = params?.ownerId as string;
  const { sharedWorkspaces } = useSharedWorkspaces();
  
  // React Query Hooks - isLoading nur beim ersten Load, nicht bei Background Refetch
  const { 
    data: videos = [], 
    isLoading, 
    isFetching,
    refetch: refetchVideos
  } = useSharedWorkspaceVideosQuery(ownerId);
  const { 
    updateWorkspaceVideo: updateVideo, 
    updateWorkspaceVideoAsync: updateVideoAsync,
    deleteWorkspaceVideo: deleteVideo,
    bulkUpdateWorkspaceVideosAsync: bulkUpdateVideosAsync
  } = useVideoMutations({
    onAutoAssign: (personName, videoTitle) => {
      addToast({
        type: 'success',
        title: 'Automatische Zuweisung',
        message: `${personName} wurde automatisch dem Video "${videoTitle}" zugewiesen`
      });
    }
  });
  
  // Setup Realtime for workspace
  useRealtimeWorkspaceVideos(ownerId);
  
  // 🔥 Force refetch bei Tab-Fokus (zusätzliche Absicherung)
  useTabFocusRefetch();
  
  // Nur Skeleton zeigen beim ersten Load, nicht bei Background Refetch
  const showSkeleton = isLoading && !videos.length;
  
  // Get workspace info
  const currentWorkspace = sharedWorkspaces.find(w => w.workspace_owner_id === ownerId);
  
  // Get permissions from current workspace
  const permissions = currentWorkspace?.permissions || {
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false
  };
  
  // Create workspace owner object from current workspace
  const workspaceOwner = currentWorkspace ? {
    id: ownerId, // workspace_owner_id
    firstname: currentWorkspace.owner_name.split(' ')[0] || '',
    lastname: currentWorkspace.owner_name.split(' ').slice(1).join(' ') || '',
    email: currentWorkspace.owner_email
  } : undefined;
  
  const {
    options: responsibleOptions,
    isLoading: responsibleOptionsLoading,
    personMap: responsiblePersonMap
  } = useResponsiblePeople(ownerId);
  const filterPersonOptions = useMemo(() => {
    return responsibleOptions.map((option) => {
      const person = responsiblePersonMap[option.id];
      return {
        id: option.id,
        firstname: person?.firstname || option.name,
        lastname: person?.lastname || '',
        email: person?.email || option.email
      };
    });
  }, [responsibleOptions, responsiblePersonMap]);
  
  // Dynamic sidebar items including shared workspaces
  const sidebarItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: false
    },
    {
      name: 'Videos',
      icon: VideoIcon,
      href: '/dashboard/videos',
      active: false
    },
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
        active: workspace.workspace_owner_id === ownerId // Active if this is the current workspace
      };
    })
  ];
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails] = useState({ title: '', message: '', details: '' });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // Status filter
  const [isMobile, setIsMobile] = useState(false);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [newVideo, setNewVideo] = useState({
    name: '',
    status: 'Idee',
    publication_date: '',
    responsible_person: '',
    inspiration_source: '',
    description: ''
  });

  // Bulk Edit States
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());

  // File Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalVideo, setUploadModalVideo] = useState<Video | null>(null);

  // Mobile Expanded Card State
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Table Settings & Views States
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showViewCreateModal, setShowViewCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<WorkspaceView | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Filter & Sort States
  const [activeFilters, setActiveFilters] = useState<Record<string, FilterValue>>({});
  const [activeSorts, setActiveSorts] = useState<SortConfig[]>([]);
  
  // Dropdown States
  const [columnDropdownOpen, setColumnDropdownOpen] = useState<string | null>(null);
  const [columnDropdownTrigger, setColumnDropdownTrigger] = useState<HTMLElement | null>(null);
  const [filterSubmenuOpen, setFilterSubmenuOpen] = useState<string | null>(null);
  const [filterSubmenuTrigger, setFilterSubmenuTrigger] = useState<HTMLElement | null>(null);

  // Table Settings Hook (lädt Settings des Users)
  const {
    settings: tableSettings,
    updateColumnOrder,
    updateColumnWidth,
    toggleColumnVisibility,
    resetSettings
  } = useTableSettings({
    userId: user?.id,
    workspaceOwnerId: user?.id,
    context: 'own_videos'
  });

  // Workspace Views Hook
  const {
    views: workspaceViews,
    createView,
    updateView,
    deleteView,
    setDefaultView
  } = useWorkspaceViews(user?.id);

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
    console.log('[Table] Visible columns:', visibleColumns.map(c => c.id));
  }, [visibleColumns]);

  // Toast helpers - useCallback für stabile Referenzen
  const removeToast = React.useCallback((id: string) => {
    console.log('[VideosPage] removeToast aufgerufen für ID:', id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    console.log('[VideosPage] addToast aufgerufen, neue ID:', id, 'duration:', toast.duration);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  }, [removeToast]);

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
        return { icon: VideoIcon, color: 'text-neutral-400' };
    }
  };

  // Redirect wenn nicht angemeldet
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Note: ?edit=videoId feature from main videos page is not needed in shared workspaces

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

  // Body scroll lock for Add/Edit modals - Verbesserte Version
  useEffect(() => {
    if (showAddModal || showEditModal) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showAddModal, showEditModal]);

  // LocalStorage Persistierung für Filter und Sortierungen
  useEffect(() => {
    if (activeViewId) {
      // Speichere in View
      const view = workspaceViews.find(v => v.id === activeViewId);
      if (view) {
        // Debounced update - nur wenn sich Werte geändert haben
        const timeoutId = setTimeout(async () => {
          try {
            await updateView({
              id: activeViewId,
              updates: {
                filters: activeFilters,
                sort_config: activeSorts
              }
            });
            console.log('[Filter/Sort] Auto-saved to view:', activeViewId);
          } catch (error) {
            console.error('[Filter/Sort] Error auto-saving to view:', error);
          }
        }, 1000); // 1 Sekunde Debounce
        
        return () => clearTimeout(timeoutId);
      }
    } else {
      // Speichere in localStorage für "Alle Videos"
      localStorage.setItem('default_view_filters', JSON.stringify(activeFilters));
      localStorage.setItem('default_view_sorts', JSON.stringify(activeSorts));
    }
  }, [activeFilters, activeSorts, activeViewId, workspaceViews, updateView]);

  // Lade initial Filter und Sortierungen beim Mount
  useEffect(() => {
    // Nur beim initialen Mount laden
    if (!activeViewId) {
      const savedFilters = localStorage.getItem('default_view_filters');
      const savedSorts = localStorage.getItem('default_view_sorts');
      
      if (savedFilters) {
        try {
          setActiveFilters(JSON.parse(savedFilters));
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
      
      if (savedSorts) {
        try {
          setActiveSorts(JSON.parse(savedSorts));
        } catch (e) {
          console.error('Error parsing saved sorts:', e);
        }
      }
    }
  }, []); // Nur beim Mount

  // Helper function: Check if user can edit a specific video
  const canEditVideo = (video: Video): boolean => {
    // If it's the user's own video (no workspace_permissions = own video)
    if (!video.workspace_permissions) {
      return permissions.can_edit;
    }
    // If it's a shared workspace video, check workspace permissions
    return video.workspace_permissions.can_edit;
  };

  // Helper function: Check if user can delete a specific video
  const canDeleteVideo = (video: Video): boolean => {
    // If it's the user's own video (no workspace_permissions = own video)
    if (!video.workspace_permissions) {
      return permissions.can_delete;
    }
    // If it's a shared workspace video, check workspace permissions
    return video.workspace_permissions.can_delete;
  };

  // Handler für Inline-Editing - Generischer Save Handler mit Bulk-Support
  const handleFieldSave = async (videoId: string, field: string, value: string) => {
    // Check if this video is selected and bulk mode is active
    const shouldBulkUpdate = isBulkEditMode && selectedVideoIds.size > 0 && selectedVideoIds.has(videoId);
    const videosToUpdate = shouldBulkUpdate ? Array.from(selectedVideoIds) : [videoId];
    
    try {
      if (videosToUpdate.length > 1) {
        // Bulk update
        await bulkUpdateVideosAsync({
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
        await updateVideoAsync({
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
      // Create video via API route (bypasses RLS)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      const response = await fetch(`/api/workspace/${ownerId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: trimmedName,
          status: newVideo.status,
          publication_date: newVideo.publication_date || null,
          responsible_person: newVideo.responsible_person || null,
          inspiration_source: newVideo.inspiration_source || null,
          description: newVideo.description || null,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen');
      }

      const result = await response.json();
      console.log('Video erfolgreich erstellt!', result.video);

      // Refetch videos
      await refetchVideos();
      
      setShowAddModal(false);
      setNewVideo({
        name: '',
        status: 'Idee',
        publication_date: '',
        responsible_person: '',
        inspiration_source: '',
        description: ''
      });
      
      addToast({
        type: 'success',
        title: 'Video erstellt',
        message: `"${trimmedName}" wurde erfolgreich erstellt`
      });
    } catch (error) {
      console.error('Error adding video:', error);
      addToast({
        type: 'error',
        title: 'Video-Erstellung fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  };

  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    // Check permissions first
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Du hast keine Berechtigung, den Status zu ändern.'
      });
      return;
    }

    // Check if this video is selected and bulk mode is active
    const shouldBulkUpdate = isBulkEditMode && selectedVideoIds.size > 0 && selectedVideoIds.has(videoId);
    const videosToUpdate = shouldBulkUpdate ? Array.from(selectedVideoIds) : [videoId];

    try {
      if (videosToUpdate.length > 1) {
        // Bulk update
        await bulkUpdateVideosAsync({
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
        updateVideo({
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
      // Trigger manual save of TipTap editor before closing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (window as any).__tipTapManualSave === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__tipTapManualSave();
      }

      updateVideo({
        id: editingVideo.id,
        updates: {
          status: editingVideo.status,
          publication_date: editingVideo.publication_date || null,
          responsible_person: editingVideo.responsible_person || null,
          inspiration_source: editingVideo.inspiration_source || null,
          // description field removed - now handled by TipTap editor
        },
        ownerId
      });
      
      setShowEditModal(false);
      setEditingVideo(null);
      
      addToast({
        type: 'success',
        title: 'Video aktualisiert',
        message: 'Änderungen wurden erfolgreich gespeichert'
      });
    } catch (error) {
      console.error('Error updating video:', error);
      addToast({
        type: 'error',
        title: 'Video-Update fehlgeschlagen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  };

  const handleDeleteVideo = (video: Video) => {
    setVideoToDelete(video);
    setShowDeleteModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      deleteVideo({ id: videoToDelete.id, ownerId });
      
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
    // Wenn geklickt auf Aktions-Buttons, ignorieren
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select') || target.closest('a')) {
      return;
    }

    // Bulk-Edit-Mode mit Strg/Cmd
    if (isBulkEditMode && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const isSelected = selectedVideoIds.has(videoId);
      handleVideoSelection(videoId, !isSelected);
      return;
    }

    // Normaler Klick: Edit-Modal öffnen
    if (!isBulkEditMode) {
      const video = filteredVideos.find(v => v.id === videoId);
      if (video && canEditVideo(video)) {
        handleEditVideo(video);
      }
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
    console.log('[Upload] Syncing video data before opening upload modal...');
    const { data: refetchedVideos } = await refetchVideos();
    
    // Finde das aktualisierte Video
    const updatedVideo = refetchedVideos?.find(v => v.id === video.id) || video;
    
    console.log('[Upload] Video data synced:', {
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
    console.log('[Storage] Syncing video data before opening storage location...');
    const { data: refetchedVideos } = await refetchVideos();
    
    // Finde das aktualisierte Video
    const updatedVideo = refetchedVideos?.find(v => v.id === video.id) || video;
    
    console.log('[Storage] Video data synced:', {
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
    
    // Lade Spalteneinstellungen, Filter und Sortierungen der neuen Ansicht
    if (viewId) {
      const view = workspaceViews.find(v => v.id === viewId);
      if (view) {
        // Lade column_settings
        if (view.column_settings) {
          if (view.column_settings.order && view.column_settings.order.length > 0) {
            await updateColumnOrder(view.column_settings.order);
          }
          if (view.column_settings.hidden && view.column_settings.hidden.length > 0) {
            for (const columnId of view.column_settings.hidden) {
              await toggleColumnVisibility(columnId);
            }
          }
        }
        
        // Lade Filter und Sortierungen
        setActiveFilters(view.filters || {});
        setActiveSorts(view.sort_config || []);
        
        addToast({
          type: 'success',
          title: 'Ansicht geladen',
          message: `"${view.name}" wurde geladen.`,
          duration: 2000
        });
      }
    } else {
      // "Alle Videos" - Reset zu gespeicherten Werten aus localStorage
      const savedFilters = localStorage.getItem('default_view_filters');
      const savedSorts = localStorage.getItem('default_view_sorts');
      
      if (savedFilters) {
        try {
          setActiveFilters(JSON.parse(savedFilters));
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      } else {
        setActiveFilters({});
      }
      
      if (savedSorts) {
        try {
          setActiveSorts(JSON.parse(savedSorts));
        } catch (e) {
          console.error('Error parsing saved sorts:', e);
        }
      } else {
        setActiveSorts([]);
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
    filters: Record<string, FilterValue>;
    sort_config?: SortConfig[];
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

  // Prüfe ob Spalte sortierbar ist (nur Name und Veröffentlichung)
  const canSortColumn = (columnId: string): boolean => {
    return columnId === 'title' || columnId === 'publication_date';
  };

  // Filter & Sort Handlers
  const handleAddSort = (columnId: string, direction: 'asc' | 'desc') => {
    console.log('[handleAddSort] Aufgerufen mit columnId:', columnId, 'direction:', direction);
    console.log('[handleAddSort] canSortColumn:', canSortColumn(columnId));
    
    // Prüfe ob Spalte sortierbar ist
    if (!canSortColumn(columnId)) {
      addToast({
        type: 'warning',
        title: 'Sortierung nicht verfügbar',
        message: 'Sortierung ist nur für "Name" und "Veröffentlichung" verfügbar.',
        duration: 2000
      });
      return;
    }

    // Mappe Spalten-ID zu Video-Feld-Name
    const field = columnToFieldMap[columnId] || columnId;
    console.log('[handleAddSort] Mapped field:', field);
    
    // Prüfe ob bereits sortiert
    const existingIndex = activeSorts.findIndex(s => s.field === field);
    console.log('[handleAddSort] Existing index:', existingIndex);
    
    if (existingIndex >= 0) {
      // Aktualisiere bestehende Sortierung
      const newSorts = [...activeSorts];
      newSorts[existingIndex] = { ...newSorts[existingIndex], direction };
      console.log('[handleAddSort] Updating existing sort:', newSorts);
      setActiveSorts(newSorts);
    } else {
      // Füge neue Sortierung hinzu mit höchster Priorität
      const newSort: SortConfig = {
        field,
        direction,
        priority: activeSorts.length
      };
      console.log('[handleAddSort] Adding new sort:', newSort);
      setActiveSorts([...activeSorts, newSort]);
    }

    addToast({
      type: 'success',
      title: 'Sortierung hinzugefügt',
      message: `Sortiert nach ${fieldLabels[columnId] || columnId} (${direction === 'asc' ? 'aufsteigend' : 'absteigend'})`,
      duration: 2000
    });
  };

  const handleRemoveSort = (field: string) => {
    const newSorts = activeSorts.filter(s => s.field !== field);
    // Prioritäten neu berechnen
    const reorderedSorts = newSorts.map((sort, index) => ({
      ...sort,
      priority: index
    }));
    setActiveSorts(reorderedSorts);
  };

  const handleUpdateSortPriority = (field: string, newPriority: number) => {
    const sortedSorts = [...activeSorts].sort((a, b) => a.priority - b.priority);
    const movedSort = sortedSorts.find(s => s.field === field);
    if (!movedSort) return;

    const otherSorts = sortedSorts.filter(s => s.field !== field);
    otherSorts.splice(newPriority, 0, movedSort);

    // Prioritäten neu setzen
    const reorderedSorts = otherSorts.map((sort, index) => ({
      ...sort,
      priority: index
    }));

    setActiveSorts(reorderedSorts);
  };

  const handleAddFilter = (field: string, value: FilterValue) => {
    if (value === null || value === undefined) {
      // Remove filter
      const newFilters = { ...activeFilters };
      delete newFilters[field];
      setActiveFilters(newFilters);
    } else {
      setActiveFilters({
        ...activeFilters,
        [field]: value
      });
      
      addToast({
        type: 'success',
        title: 'Filter hinzugefügt',
        message: `Gefiltert nach ${fieldLabels[field] || field}`,
        duration: 2000
      });
    }
  };

  const handleRemoveFilter = (field: string) => {
    const newFilters = { ...activeFilters };
    delete newFilters[field];
    setActiveFilters(newFilters);
  };

  const handleEditFilter = (field: string) => {
    // Öffne Filter-Submenu für dieses Feld
    const headerElement = document.querySelector(`[data-column-id="${field}"]`) as HTMLElement;
    if (headerElement) {
      setFilterSubmenuOpen(field);
      setFilterSubmenuTrigger(headerElement);
    }
  };

  // Column Header Click Handler
  const handleHeaderClick = (columnId: string, element: HTMLElement) => {
    setColumnDropdownOpen(columnId);
    setColumnDropdownTrigger(element);
  };

  // Column Type Mapping
  const getColumnType = (columnId: string): ColumnType => {
    if (columnId === 'status') return 'status';
    if (columnId === 'responsible_person') return 'person';
    if (columnId === 'storage_location') return 'location';
    if (columnId === 'publication_date' || columnId === 'updated_at') return 'date';
    return 'text';
  };

  const getFilterType = (columnId: string): FilterType => {
    if (columnId === 'status') return 'status';
    if (columnId === 'responsible_person') return 'person';
    if (columnId === 'storage_location') return 'location';
    if (columnId === 'publication_date' || columnId === 'updated_at') return 'date';
    return 'status'; // fallback
  };

  const canFilterColumn = (columnId: string): boolean => {
    // Nur bestimmte Spalten können gefiltert werden
    return ['status', 'responsible_person', 'storage_location', 'publication_date', 'updated_at'].includes(columnId);
  };

  // Field Labels für schöne Anzeige
  const fieldLabels: Record<string, string> = {
    title: 'Name',
    status: 'Status',
    publication_date: 'Veröffentlichung',
    responsible_person: 'Verantwortlich',
    storage_location: 'Speicherort',
    inspiration_source: 'Inspiration',
    description: 'Beschreibung',
    updated_at: 'Aktualisiert',
    last_updated: 'Aktualisiert'
  };

  // Mapping von Spalten-IDs zu Video-Feld-Namen für Sortierung
  const columnToFieldMap: Record<string, string> = {
    title: 'title', // Spalten-ID 'title' -> Video-Feld 'title'
    status: 'status',
    publication_date: 'publication_date',
    responsible_person: 'responsible_person',
    storage_location: 'storage_location',
    inspiration_source: 'inspiration_source',
    description: 'description',
    updated_at: 'last_updated', // Spalten-ID 'updated_at' -> Video-Feld 'last_updated'
    last_updated: 'last_updated'
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

  // Sticky Header Hook - wird aktiv bei Scroll > 200px (später aktivieren für flüssigere Transition)
  const isHeaderSticky = useStickyHeader(200);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showStickyAnimation, setShowStickyAnimation] = useState(false);
  const wasSticky = useRef(false);

  // Messe die Header-Höhe für den Placeholder
  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [isHeaderSticky, workspaceViews.length]);

  // Track Animation - nur abspielen beim Übergang zu sticky (optimiert)
  useEffect(() => {
    // Nur State ändern wenn nötig
    if (isHeaderSticky !== wasSticky.current) {
      if (isHeaderSticky) {
        // Wurde gerade sticky
        wasSticky.current = true;
        setShowStickyAnimation(true);
        
        // Animation nach 300ms entfernen (Animation ist fertig)
        const timer = setTimeout(() => {
          setShowStickyAnimation(false);
        }, 300);
        
        return () => clearTimeout(timer);
      } else {
        // Ist nicht mehr sticky
        wasSticky.current = false;
        setShowStickyAnimation(false);
      }
    }
  }, [isHeaderSticky]);

  // Get active view filters (activeView ist bereits oben definiert)
  const viewFilters = activeView?.filters || {};

  // Filter and Sort videos with useMemo for performance
  const filteredVideos = React.useMemo(() => {
    let result = [...videos];

    // 1. Apply active filters
    Object.entries(activeFilters).forEach(([field, value]) => {
      if (!value) return;

      result = result.filter(video => {
        if (field === 'status') {
          // Array von Status-Werten
          return Array.isArray(value) && value.includes(video.status);
        }
        
        if (field === 'responsible_person') {
          // Array von Person IDs
          if (!Array.isArray(value)) return true;
          if (value.includes('unassigned') && !video.responsible_person) return true;
          return video.responsible_person && value.includes(video.responsible_person);
        }
        
        if (field === 'storage_location') {
          // Array von Locations
          return Array.isArray(value) && video.storage_location && value.includes(video.storage_location);
        }
        
        if (field === 'publication_date' || field === 'updated_at') {
          // Datum Range
          if (typeof value !== 'object' || Array.isArray(value) || value === null) return true;
          const videoDate = new Date(video[field as keyof Video] as string);
          if ('from' in value && value.from && videoDate < new Date(value.from)) return false;
          if ('to' in value && value.to && videoDate > new Date(value.to)) return false;
          return true;
        }
        
        return true;
      });
    });

    // 2. Legacy Status Filter (from filter button - wird später durch neue Filter ersetzt)
    if (statusFilter) {
      result = result.filter(video => video.status === statusFilter);
    }
    
    // 3. View filters (from active view - legacy support)
    if (activeViewId && Object.keys(viewFilters).length > 0) {
      result = result.filter(video => {
        for (const [key, value] of Object.entries(viewFilters)) {
          if (value === null || value === undefined || value === '') continue;
          
          if (key === 'status' && video.status !== value) {
            return false;
          }
          if (key === 'responsible_person' && video.responsible_person !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // 4. Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(video => {
        const videoName = video.name || video.title || '';
        return (
          videoName.toLowerCase().includes(searchLower) ||
          video.status.toLowerCase().includes(searchLower) ||
          (video.responsible_person && video.responsible_person.toLowerCase().includes(searchLower)) ||
          (video.description && video.description.toLowerCase().includes(searchLower)) ||
          (video.inspiration_source && video.inspiration_source.toLowerCase().includes(searchLower))
        );
      });
    }

    // 5. Apply sorts (in priority order)
    if (activeSorts.length > 0) {
      const sortedSorts = [...activeSorts].sort((a, b) => a.priority - b.priority);
      
      result.sort((a, b) => {
        for (const sort of sortedSorts) {
          const aVal = a[sort.field as keyof Video];
          const bVal = b[sort.field as keyof Video];
          
          // Handle null/undefined
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          
          // Compare based on type
          let comparison = 0;
          
          // Spezielle Behandlung für Datum-Felder
          if (sort.field === 'publication_date' || sort.field === 'last_updated' || sort.field === 'updated_at' || sort.field === 'created_at') {
            const aDate = aVal ? new Date(aVal as string).getTime() : 0;
            const bDate = bVal ? new Date(bVal as string).getTime() : 0;
            comparison = aDate - bDate;
          } else if (typeof aVal === 'string' && typeof bVal === 'string') {
            comparison = aVal.localeCompare(bVal, 'de', { sensitivity: 'base' });
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else if (aVal instanceof Date || bVal instanceof Date) {
            comparison = new Date(aVal as string | number | Date).getTime() - new Date(bVal as string | number | Date).getTime();
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return result;
  }, [videos, activeFilters, activeSorts, statusFilter, viewFilters, activeViewId, searchTerm]);

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

  // Helper function for relative time formatting
  const formatRelativeTime = (dateString: string | null | undefined): string => {
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

  // Cell Rendering Function - Maps column IDs to their respective cell content
  // Must be defined AFTER all handler functions it depends on
  const renderCell = React.useCallback((columnId: string, video: Video) => {
    const statusInfo = getStatusIcon(video.status);
    const StatusIcon = statusInfo.icon;

    switch (columnId) {
      case 'checkbox':
        return (
          <td key={`${video.id}-checkbox`} className="py-4 px-4 border-r border-neutral-800/30">
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
          <td key={`${video.id}-title`} className="py-4 px-4 border-r border-neutral-800/30">
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
          <td key={`${video.id}-status`} className="py-4 px-4 border-r border-neutral-800/30">
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
          <td key={`${video.id}-publication_date`} className="py-4 px-4 border-r border-neutral-800/30">
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
          <td key={`${video.id}-responsible_person`} className="py-4 px-4 border-r border-neutral-800/30">
            <EditableResponsiblePerson
              value={video.responsible_person}
              videoId={video.id}
              onSave={async (videoId, field, value) => {
                await handleFieldSave(videoId, field, value);
              }}
              editable={permissions.can_edit}
              options={responsibleOptions}
              isOptionsLoading={responsibleOptionsLoading}
              personMap={responsiblePersonMap}
            />
          </td>
        );

      case 'upload':
        return (
          <td key={`${video.id}-upload`} className="py-4 px-4 border-r border-neutral-800/30">
            <div className="flex items-center justify-center">
              {video.storage_location ? (
                <button
                  onClick={() => handleOpenUploadModal(video)}
                  className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 hover:border-blue-500/40 flex items-center justify-center"
                  title="Dateien hochladen"
                >
                  <Upload className="w-5 h-5" />
                </button>
              ) : (
                <Tooltip 
                  content="Der Speicherort wird noch erstellt und wird in Kürze (max. 5 Minuten) verfügbar sein. Bitte um Geduld. Sollte die Funktion nicht verfügbar sein, bitte Kontakt aufnehmen."
                  position="top"
                  maxWidth="300px"
                >
                  <button
                    disabled
                    className="p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20 flex items-center justify-center"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </button>
                </Tooltip>
              )}
            </div>
          </td>
        );

      case 'storage_location':
        return (
          <td key={`${video.id}-storage_location`} className="py-4 px-4 border-r border-neutral-800/30">
            <div className="flex items-center justify-center">
              {video.storage_location ? (
                <button
                  onClick={() => handleOpenStorageLocation(video)}
                  className="p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors flex items-center justify-center"
                  title="Ordner durchsuchen"
                >
                  <FolderOpen className="w-5 h-5" />
                </button>
              ) : (
                <span className="text-neutral-500 text-sm">-</span>
              )}
            </div>
          </td>
        );

      case 'updated_at':
        return (
          <td key={`${video.id}-updated_at`} className="py-4 px-4 text-neutral-300 text-sm border-r border-neutral-800/30">
            {formatRelativeTime(video.last_updated || video.updated_at)}
          </td>
        );

      case 'inspiration_source':
        return (
          <td key={`${video.id}-inspiration_source`} className="py-4 px-4 border-r border-neutral-800/30">
            <EditableCell
              value={video.inspiration_source}
              videoId={video.id}
              field="inspiration_source"
              onSave={handleFieldSave}
              editable={permissions.can_edit}
              type="url"
              placeholder="URL hinzufügen"
            />
          </td>
        );

      case 'actions':
        return (
          <td key={`${video.id}-actions`} className="py-4 px-4">
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => {
                  if (canEditVideo(video)) {
                    handleEditVideo(video);
                  } else {
                    addToast({
                      type: 'error',
                      title: 'Keine Berechtigung',
                      message: 'Du hast keine Berechtigung, Videos zu bearbeiten.'
                    });
                  }
                }}
                className={`transition-colors ${
                  canEditVideo(video)
                    ? 'text-white hover:text-neutral-300' 
                    : 'text-neutral-600 hover:text-neutral-500 cursor-pointer'
                }`}
                title={canEditVideo(video) ? 'Video bearbeiten' : 'Keine Berechtigung'}
              >
                <Edit className="w-5 h-5" />
              </button>
              
              {canDeleteVideo(video) && (
                <button
                  onClick={() => handleDeleteVideo(video)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  title="Video löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </td>
        );

      default:
        return <td key={`${video.id}-${columnId}`} className="py-4 px-4 border-r border-neutral-800/30"></td>;
    }
  }, [
    selectedVideoIds,
    permissions,
    workspaceOwner,
    responsibleOptions,
    responsibleOptionsLoading,
    handleVideoSelection,
    handleUpdateStatus,
    handleFieldSave,
    handleOpenUploadModal,
    canEditVideo,
    canDeleteVideo,
    handleEditVideo,
    handleDeleteVideo
  ]);

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
                  {/* Premium Crown - Hidden in workspace view */}
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
                  <item.icon className={`w-6 h-6 flex-shrink-0 ${item.active ? 'text-black' : 'text-neutral-400'} transition-colors ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                  {!sidebarCollapsed && <span className="ml-3 truncate" title={item.name}>{item.name}</span>}
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
          {/* Subscription Warning */}
          
          {/* Workspace Description */}
          <div className="mt-6 bg-neutral-900/30 border border-neutral-700/50 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <p className="text-neutral-400 text-sm leading-relaxed flex-1">
                <span className="font-medium text-neutral-300">
                  Workspace von {workspaceOwner?.firstname || workspaceOwner?.email || 'Unbekannt'}:
                </span> Hier befinden sich alle Videos von {workspaceOwner?.firstname || workspaceOwner?.email || 'diesem Workspace'}. 
                {permissions.can_edit ? 'Du kannst Videos bearbeiten' : 'Du hast nur Leserechte'}.
              </p>
              {/* Permissions Badge */}
              <div className="ml-4 flex items-center gap-2">
                {permissions.can_view && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                    Ansehen
                  </span>
                )}
                {permissions.can_edit && (
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">
                    Bearbeiten
                  </span>
                )}
                {permissions.can_create && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                    Erstellen
                  </span>
                )}
                {permissions.can_delete && (
                  <span className="px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">
                    Löschen
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Search Bar & Filter */}
          <div className="md:hidden mt-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-search-input bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl focus:ring-white focus:border-white block w-full pl-10 p-3 placeholder-neutral-400"
                placeholder="Videos suchen..."
              />
            </div>
            
            {/* Status Filter Mobile */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl focus:ring-white focus:border-white block w-full p-3 placeholder-neutral-400"
            >
              <option value="">Alle Status</option>
              <option value="Idee">Idee</option>
              <option value="Warten auf Aufnahme">Warten auf Aufnahme</option>
              <option value="In Bearbeitung (Schnitt)">In Bearbeitung</option>
              <option value="Schnitt abgeschlossen">Schnitt abgeschlossen</option>
              <option value="Hochgeladen">Hochgeladen</option>
            </select>
          </div>
        </div>

        {/* Videos Table */}
        {showSkeleton ? (
          <VideoTableSkeleton />
        ) : (
          <>
            {/* Placeholder für Sticky Header - verhindert Layout-Shift */}
            {isHeaderSticky && (
              <div style={{ height: headerHeight }} />
            )}

            {/* Sticky Header mit position: fixed */}
            <div 
              ref={headerRef}
              className={`${
                isHeaderSticky 
                  ? `fixed top-16 z-30 shadow-lg ${showStickyAnimation ? 'animate-slideDown' : ''}` 
                  : 'relative z-20'
              } transition-all duration-300 ease-in-out`}
              style={{
                left: isHeaderSticky && !isMobile ? `calc(${sidebarCollapsed ? '80px' : '256px'} + 16px)` : (isHeaderSticky && isMobile ? '16px' : undefined),
                right: isHeaderSticky ? '16px' : undefined,
                width: isHeaderSticky && !isMobile ? `calc(100% - ${sidebarCollapsed ? '80px' : '256px'} - 32px)` : (isHeaderSticky && isMobile ? 'calc(100% - 32px)' : undefined)
              }}
            >
              {/* Header mit Title und Actions - zusammenhängend */}
              <div className={`bg-neutral-900/95 backdrop-blur-md rounded-t-2xl border border-neutral-700 px-6 ${isHeaderSticky ? 'py-5' : 'py-4'} flex items-center justify-between`}>
                <h3 className="text-lg font-semibold text-white">Alle Videos</h3>

                {/* Action Buttons - Rechts mit neuer Reihenfolge */}
                <div className="flex items-center gap-2">
                  {/* Desktop Search - Jetzt rechts */}
                  <div className="hidden md:flex relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-neutral-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-neutral-800/50 border border-neutral-700 text-white text-sm rounded-lg focus:ring-white focus:border-white pl-10 pr-3 py-2 w-64 placeholder-neutral-400"
                      placeholder="Videos suchen..."
                    />
                  </div>

                  {/* Mobile Search Icon */}
                  <Tooltip content="Suchen" position="left">
                    <button
                      onClick={() => {
                        // Scroll zur mobilen Suchleiste
                        const mobileSearch = document.querySelector('.mobile-search-input') as HTMLInputElement;
                        if (mobileSearch) {
                          mobileSearch.focus();
                          mobileSearch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="md:hidden p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-all"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </Tooltip>

                  {/* Spalten-Einstellungen - Nur Desktop */}
                  <Tooltip content="Spalten anpassen" position="left">
                    <button
                      onClick={() => setShowColumnsModal(true)}
                      className="hidden md:block p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-all"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </Tooltip>

                  {/* Mehrfachbearbeitung - Nur Desktop */}
                  <Tooltip content={isBulkEditMode ? "Bearbeitung deaktivieren" : "Mehrfachbearbeitung"} position="left">
                    <button
                      onClick={handleToggleBulkMode}
                      className={`hidden md:block p-2 rounded-lg transition-all ${
                        isBulkEditMode
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                      }`}
                    >
                      {isBulkEditMode ? <CheckSquare className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </button>
                  </Tooltip>

                  {/* Neues Video - Nur wenn can_create Permission */}
                  {permissions.can_create && (
                    <Tooltip content="Neues Video erstellen" position="left">
                      <button
                        onClick={() => {
                        if (permissions.can_create) {
                          setShowAddModal(true);
                        } else {
                          addToast({
                            type: 'error',
                            title: 'Keine Berechtigung',
                            message: 'Du hast keine Berechtigung, Videos zu erstellen.'
                          });
                        }
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        permissions.can_create 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-sm' 
                          : 'bg-neutral-700 text-neutral-400 border border-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </Tooltip>
                  )}

                  {/* Loading Indicator */}
                  {isFetching && !isLoading && (
                    <div className="hidden md:flex items-center text-neutral-400 text-sm ml-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* View Tabs - direkt angehängt ohne Lücke */}
              <div className={`bg-neutral-900/95 backdrop-blur-md border-x border-b border-t-0 border-neutral-700 ${isHeaderSticky ? 'rounded-b-2xl' : ''} px-6`}>
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
              </div>
            </div>

            {/* Active Filters & Sorts Bar */}
            <ActiveFiltersBar
              filters={activeFilters}
              sorts={activeSorts}
              onRemoveFilter={handleRemoveFilter}
              onRemoveSort={handleRemoveSort}
              onUpdateSortPriority={handleUpdateSortPriority}
              onEditFilter={handleEditFilter}
              fieldLabels={(() => {
                // Erstelle Reverse-Mapping: Video-Feld -> Spalten-ID -> Label
                const reverseMap: Record<string, string> = {};
                Object.entries(columnToFieldMap).forEach(([columnId, field]) => {
                  reverseMap[field] = fieldLabels[columnId] || columnId;
                });
                // Füge direkte Mappings hinzu für Felder die gleich sind
                Object.keys(fieldLabels).forEach(key => {
                  if (!reverseMap[key]) {
                    reverseMap[key] = fieldLabels[key];
                  }
                });
                return reverseMap;
              })()}
              personMap={responsiblePersonMap}
            />

            {/* Tabellen-Content - sieht aus wie Fortsetzung */}
            <div className={`bg-neutral-900/50 backdrop-blur-md ${isHeaderSticky ? 'rounded-3xl border mt-2' : 'rounded-b-3xl border border-t-0'} border-neutral-700`}>
            {filteredVideos.length === 0 ? (
            <div className="text-center py-12">
              <VideoIcon className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
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
                      onHeaderClick={handleHeaderClick}
                      activeFilters={activeFilters}
                      activeSorts={activeSorts}
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
                        className={`border-b border-neutral-800/30 hover:bg-neutral-800/30 cursor-pointer ${selectedVideoIds.has(video.id) ? 'border-l-4 border-l-blue-500 bg-blue-500/5' : ''} transition-all duration-200`}
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
                  const isExpanded = expandedCardId === video.id;
                  
                  return (
                    <div key={video.id} className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-4 space-y-3">
                      {/* Header mit Titel, Status Icon und Actions */}
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
                                addToast({
                                  type: 'error',
                                  title: 'Keine Berechtigung',
                                  message: 'Du hast keine Berechtigung, Videos zu bearbeiten.'
                                });
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
                        </div>
                      </div>

                      {/* Status Dropdown */}
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

                      {/* Verantwortlich */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-2">Verantwortlich</label>
                        <ResponsiblePersonAvatar 
                          responsiblePerson={video.responsible_person} 
                          size="sm" 
                          showFullName={true}
                        />
                      </div>

                      {/* Aktionen Grid: Upload & Speicherort */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-2">Dateien hochladen</label>
                          {video.storage_location ? (
                            <button
                              onClick={() => handleOpenUploadModal(video)}
                              className="w-full p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 flex items-center justify-center"
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
                                className="w-full p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20 flex items-center justify-center"
                              >
                                <Loader2 className="h-5 w-5 animate-spin" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-2">Speicherort</label>
                          {video.storage_location ? (
                            <button
                              onClick={() => handleOpenStorageLocation(video)}
                              className="w-full p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors flex items-center justify-center border border-neutral-700"
                              title="Ordner durchsuchen"
                            >
                              <FolderOpen className="h-5 w-5" />
                            </button>
                          ) : (
                            <div className="w-full p-3 bg-neutral-800/30 rounded-lg flex items-center justify-center border border-neutral-700">
                              <span className="text-neutral-500 text-sm">-</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details Toggle Button */}
                      <button
                        onClick={() => setExpandedCardId(isExpanded ? null : video.id)}
                        className="w-full flex items-center justify-between px-4 py-2 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-700"
                      >
                        <span className="text-sm text-neutral-300">
                          {isExpanded ? 'Details verbergen' : 'Details anzeigen'}
                        </span>
                        <ChevronDown 
                          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {/* Expandable Details Section */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-3 pt-3 border-t border-neutral-700">
                              {/* Veröffentlichungsdatum */}
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">Veröffentlichung</label>
                                <EditableDate
                                  value={video.publication_date}
                                  videoId={video.id}
                                  onSave={handleFieldSave}
                                  editable={permissions.can_edit}
                                  placeholder="Datum wählen"
                                />
                              </div>

                              {/* Inspiration */}
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">Inspiration</label>
                                <EditableCell
                                  value={video.inspiration_source}
                                  videoId={video.id}
                                  field="inspiration_source"
                                  onSave={handleFieldSave}
                                  editable={permissions.can_edit}
                                  type="url"
                                  placeholder="URL hinzufügen"
                                />
                              </div>

                              {/* Beschreibung */}
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">Beschreibung</label>
                                <EditableDescription
                                  value={video.description}
                                  videoId={video.id}
                                  onSave={handleFieldSave}
                                  editable={permissions.can_edit}
                                  placeholder="Beschreibung hinzufügen"
                                />
                              </div>

                              {/* Aktualisiert */}
                              <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">Aktualisiert</label>
                                <p className="text-neutral-300 text-sm px-3 py-2 bg-neutral-800/50 rounded-lg border border-neutral-700">
                                  {formatRelativeTime(video.last_updated || video.updated_at)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </>
            )}
            </div>
          </>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 touch-action-none"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900/95 backdrop-blur-md rounded-3xl p-4 md:p-6 max-w-2xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto overscroll-y-contain touch-action-pan-y"
              onClick={(e) => e.stopPropagation()}
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
                  <ResponsiblePersonDropdownSimple
                    value={newVideo.responsible_person}
                    onChange={(value) => setNewVideo({ ...newVideo, responsible_person: value })}
                    options={responsibleOptions}
                    isOptionsLoading={responsibleOptionsLoading}
                    personMap={responsiblePersonMap}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40 touch-action-none"
            onClick={() => {
              setShowEditModal(false);
              setEditingVideo(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900/95 backdrop-blur-md rounded-3xl p-4 md:p-6 max-w-5xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto overscroll-y-contain touch-action-pan-y"
              onClick={(e) => e.stopPropagation()}
            >
            <h3 className="text-xl font-semibold mb-6 text-white">✏️ Video bearbeiten</h3>
            
            <form onSubmit={handleUpdateVideo}>
              {/* Layout: Left Column (Preview), Right Column (Metadata) */}
              <div className="flex flex-col lg:flex-row gap-6 mb-6">
                {/* Left Column: Video Preview - nur bei Status "Schnitt abgeschlossen" oder "Hochgeladen" */}
                {(editingVideo.status === 'Schnitt abgeschlossen' || editingVideo.status === 'Hochgeladen') && (
                  <div className="lg:w-1/3 flex-shrink-0">
                    <VideoPreviewPlayer
                      videoId={editingVideo.id}
                      storageLocation={editingVideo.storage_location}
                      status={editingVideo.status}
                    />
                  </div>
                )}
                
                {/* Right Column: Metadata Fields */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Video Titel */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Video Titel
                      </label>
                      <input
                        type="text"
                        value={editingVideo.name}
                        readOnly
                        className="w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed"
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
                        Veröffentlichungsdatum
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
                      <ResponsiblePersonDropdownSimple
                        value={editingVideo.responsible_person || ''}
                        onChange={(value) => setEditingVideo({ ...editingVideo, responsible_person: value })}
                        options={responsibleOptions}
                        isOptionsLoading={responsibleOptionsLoading}
                        personMap={responsiblePersonMap}
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

                    {/* Speicherort & Upload Buttons - nur bei Status "Idee" oder "Warten auf Aufnahme" */}
                    {(editingVideo.status === 'Idee' || editingVideo.status === 'Warten auf Aufnahme') && (
                      <div className="md:col-span-2 flex gap-3">
                        {editingVideo.storage_location && (
                          <a
                            href={editingVideo.storage_location}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors text-sm border border-neutral-700"
                          >
                            <FolderOpen className="w-4 h-4" />
                            <span>Speicherort</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setUploadModalVideo(editingVideo);
                            setShowUploadModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Dateien hochladen</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anforderungen & Briefing Section - Full Width */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <h4 className="text-lg font-semibold text-white">Anforderungen & Briefing</h4>
                  </div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-300/80">
                    💡 Hier werden zusätzliche Hinweise dokumentiert, die für die Bearbeitung des Videos nötig sind.
                  </p>
                </div>
                <TipTapEditor
                  videoId={editingVideo.id}
                  storageLocation={editingVideo.storage_location}
                  editable={permissions.can_edit}
                />
              </div>

              {/* Footer Action Bar */}
              <div className="flex gap-4 justify-end pt-4 border-t border-neutral-700">
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
        onAutomationSuccess={() => {
          // Toast-Benachrichtigung
          addToast({
            type: 'success',
            title: 'Video in Bearbeitung',
            message: 'Der Status wurde auf "In Bearbeitung (Schnitt)" gesetzt und kosmamedia wurde als zuständige Person zugewiesen. Du wirst über Fortschritte benachrichtigt.',
            duration: 7000
          });
          // UI aktualisieren
          refetchVideos();
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
        currentFilters={activeFilters}
        currentSort={activeSorts}
      />

      {/* Column Header Dropdown */}
      {columnDropdownOpen && columnDropdownTrigger && (
        <ColumnHeaderDropdown
          columnId={columnDropdownOpen}
          columnLabel={fieldLabels[columnDropdownOpen] || columnDropdownOpen}
          columnType={getColumnType(columnDropdownOpen)}
          isOpen={true}
          onClose={() => {
            setColumnDropdownOpen(null);
            setColumnDropdownTrigger(null);
          }}
          triggerRef={{ current: columnDropdownTrigger }}
          onSort={(direction) => handleAddSort(columnDropdownOpen, direction)}
          onFilter={() => {
            setFilterSubmenuOpen(columnDropdownOpen);
            setFilterSubmenuTrigger(columnDropdownTrigger);
          }}
          onHide={() => toggleColumnVisibility(columnDropdownOpen)}
          canFilter={canFilterColumn(columnDropdownOpen)}
          canSort={canSortColumn(columnDropdownOpen)}
        />
      )}

      {/* Filter Submenu */}
      {filterSubmenuOpen && filterSubmenuTrigger && (
        <FilterSubmenu
          isOpen={true}
          onClose={() => {
            setFilterSubmenuOpen(null);
            setFilterSubmenuTrigger(null);
          }}
          triggerRef={{ current: filterSubmenuTrigger }}
          filterType={getFilterType(filterSubmenuOpen)}
          columnLabel={fieldLabels[filterSubmenuOpen] || filterSubmenuOpen}
          currentValue={activeFilters[filterSubmenuOpen]}
          onApply={(value) => handleAddFilter(filterSubmenuOpen, value)}
          statusOptions={['Idee', 'Warten auf Aufnahme', 'In Bearbeitung', 'Schnitt abgeschlossen', 'Hochgeladen']}
          personOptions={filterPersonOptions}
          locationOptions={Array.from(new Set(videos.map(v => v.storage_location).filter(Boolean) as string[]))}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
