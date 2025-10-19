'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useSharedWorkspaces } from '@/hooks/useSharedWorkspaces';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useVideosQuery, useVideoMutations, type Video } from '@/hooks/useVideosQuery';
import { useRealtimeVideos } from '@/hooks/useRealtimeVideos';
import { useTabFocusRefetch } from '@/hooks/useTabFocusRefetch';
import SubscriptionWarning from '@/components/SubscriptionWarning';
import VideoTableSkeleton from '@/components/VideoTableSkeleton';
import NotificationBell from '@/components/NotificationBell';
import PermissionErrorModal from '@/components/PermissionErrorModal';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ErrorModal from '@/components/ErrorModal';
import EditableCell from '@/components/EditableCell';
import EditableDescription from '@/components/EditableDescription';
import EditableDate from '@/components/EditableDate';
import EditableResponsiblePerson from '@/components/EditableResponsiblePerson';
import ResponsiblePersonAvatar from '@/components/ResponsiblePersonAvatar';
import ResponsiblePersonDropdownSimple from '@/components/ResponsiblePersonDropdownSimple';
import { ToastContainer, ToastProps } from '@/components/Toast';
import BulkEditBar from '@/components/BulkEditBar';
import { FileUploadModal } from '@/components/FileUploadModal';
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
  Crown,
  Users,
  Edit3,
  CheckSquare,
  Upload,
  FolderOpen,
  Loader2
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import Image from 'next/image';

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
  const { sharedWorkspaces } = useSharedWorkspaces();
  const { members: workspaceMembers } = useWorkspaceMembers();
  
  // React Query Hooks - isLoading nur beim ersten Load, nicht bei Background Refetch
  const { 
    data: videos = [], 
    isLoading, 
    isFetching
  } = useVideosQuery(user?.id);
  const { 
    updateVideo, 
    updateVideoAsync,
    createVideo, 
    deleteVideo,
    bulkUpdateVideosAsync
  } = useVideoMutations();
  
  // Setup Realtime
  useRealtimeVideos(user?.id);
  
  // 🔥 Force refetch bei Tab-Fokus (zusätzliche Absicherung)
  useTabFocusRefetch();
  
  // Nur Skeleton zeigen beim ersten Load, nicht bei Background Refetch
  const showSkeleton = isLoading && !videos.length;
  
  // Workspace Owner Info (current user is the owner)
  const workspaceOwner = user ? {
    firstname: user.user_metadata?.firstname || '',
    lastname: user.user_metadata?.lastname || '',
    email: user.email || ''
  } : undefined;
  
  console.log('[VideosPage] 👤 Workspace Owner Info:', workspaceOwner);
  console.log('[VideosPage] 👤 User metadata:', user?.user_metadata);
  console.log('[VideosPage] 👥 Workspace Members:', workspaceMembers);
  
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
      active: true
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
        active: false
      };
    })
  ];
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [permissionErrorAction, setPermissionErrorAction] = useState('');
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

  // Toast helpers
  const addToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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
          }
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
          }
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
      // Create video using React Query mutation
      createVideo({
        title: trimmedName,
        status: newVideo.status,
        publication_date: newVideo.publication_date || null,
        responsible_person: newVideo.responsible_person || null,
        inspiration_source: newVideo.inspiration_source || null,
        description: newVideo.description || null,
      });

      console.log('Video erfolgreich erstellt!');

      // React Query will handle the update automatically
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
    if (!permissions.canEditVideos) {
      setPermissionErrorAction('Status ändern');
      setShowPermissionError(true);
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
          updates: { status: newStatus }
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
          updates: { status: newStatus }
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
      updateVideo({
        id: editingVideo.id,
        updates: {
          status: editingVideo.status,
          publication_date: editingVideo.publication_date || null,
          responsible_person: editingVideo.responsible_person || null,
          inspiration_source: editingVideo.inspiration_source || null,
          description: editingVideo.description || null,
        }
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
      deleteVideo(videoToDelete.id);
      
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
  const handleOpenUploadModal = (video: Video) => {
    if (!video.file_drop_url) {
      addToast({
        type: 'warning',
        title: 'Upload noch nicht bereit',
        message: 'Der Upload-Ordner wird gerade erstellt. Bitte versuche es in wenigen Sekunden erneut.'
      });
      return;
    }
    setUploadModalVideo(video);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalVideo(null);
  };

  // Filter videos based on search term and status filter
  const filteredVideos = videos.filter(video => {
    // Status filter
    if (statusFilter && video.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (!searchTerm.trim()) return true; // Show all videos if search is empty
    
    const searchLower = searchTerm.toLowerCase();
    const videoName = video.name || video.title || '';
    const matches = (
      videoName.toLowerCase().includes(searchLower) ||
      video.status.toLowerCase().includes(searchLower) ||
      (video.responsible_person && video.responsible_person.toLowerCase().includes(searchLower)) ||
      (video.description && video.description.toLowerCase().includes(searchLower)) ||
      (video.inspiration_source && video.inspiration_source.toLowerCase().includes(searchLower))
    );
    
    // Debug log
    if (searchTerm.trim()) {
      console.log(`Search: "${searchTerm}" -> Video: "${videoName}" -> Match: ${matches}`);
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
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-white focus:border-white block w-48 p-2.5 placeholder-neutral-400"
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
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Videos</h1>
              <p className="text-neutral-400">Verwalte deine Video-Projekte und deren Status</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Mehrfachbearbeitung Button */}
              <button
                onClick={handleToggleBulkMode}
                className={`px-4 md:px-6 py-3 rounded-3xl flex items-center justify-center space-x-2 transition-all duration-300 sm:flex-shrink-0 ${
                  isBulkEditMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 hover:border-neutral-600'
                }`}
              >
                {isBulkEditMode ? <CheckSquare className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                <span className="hidden sm:inline">{isBulkEditMode ? 'Bearbeitung aktiv' : 'Mehrfachbearbeitung'}</span>
                <span className="sm:hidden">{isBulkEditMode ? 'Aktiv' : 'Mehrfach'}</span>
              </button>
              
              {/* Neues Video Button */}
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
          </div>
          
          {/* Subscription Warning */}
          <SubscriptionWarning className="mt-6" />
          
          {/* Workspace Description */}
          <div className="mt-6 bg-neutral-900/30 border border-neutral-700/50 rounded-2xl p-4">
            <p className="text-neutral-400 text-sm leading-relaxed">
              <span className="font-medium text-neutral-300">Mein Workspace:</span> Hier befinden sich alle Videos aus Ihrem persönlichen Workspace. Diese Videos gehören zu Ihrem Account und können von Ihnen verwaltet werden.
            </p>
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
                className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl focus:ring-white focus:border-white block w-full pl-10 p-3 placeholder-neutral-400"
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
          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Alle Videos</h3>
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
                    <tr className="border-b border-neutral-700">
                      {isBulkEditMode && (
                        <th className="text-left py-3 px-4 font-medium text-neutral-300 w-12">
                          <input
                            type="checkbox"
                            checked={selectedVideoIds.size === filteredVideos.length && filteredVideos.length > 0}
                            onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                          />
                        </th>
                      )}
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Videotitel</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Veröffentlichung</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Verantwortlich</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-300">Dateien hochladen</th>
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
                      <tr 
                        key={video.id} 
                        className={`border-b border-neutral-800 hover:bg-neutral-800/30 ${isBulkEditMode ? 'cursor-pointer' : ''} ${selectedVideoIds.has(video.id) ? 'border-l-4 border-l-blue-500 bg-blue-500/5' : ''} transition-all duration-200`}
                        onClick={(e) => handleRowClick(e, video.id)}
                      >
                        {/* Checkbox Column (nur im Bulk-Edit-Mode) */}
                        {isBulkEditMode && (
                          <td className="py-4 px-4">
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
                        )}
                        
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
                        <td className="py-4 px-4">
                          <EditableDate
                            value={video.publication_date}
                            videoId={video.id}
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
                            placeholder="Datum wählen"
                          />
                        </td>

                        {/* Verantwortlichkeit */}
                        <td className="py-4 px-4">
                          <EditableResponsiblePerson
                            value={video.responsible_person}
                            videoId={video.id}
                            onSave={async (videoId, field, value) => {
                              await handleFieldSave(videoId, field, value);
                            }}
                            editable={permissions.canEditVideos}
                            workspaceOwner={workspaceOwner}
                            workspaceMembers={workspaceMembers}
                          />
                        </td>

                {/* Datei hochladen */}
                <td className="py-4 px-4">
                  {video.storage_location ? (
                    <button
                      onClick={() => handleOpenUploadModal(video)}
                      className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 hover:border-blue-500/40"
                      title="Dateien hochladen"
                    >
                      <Upload className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20"
                      title="Ordner wird erstellt..."
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </button>
                  )}
                </td>

                        {/* Speicherort */}
                        <td className="py-4 px-4">
                          {video.storage_location ? (
                            <a
                              href={video.storage_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors inline-flex items-center"
                              title="Ordner durchsuchen"
                            >
                              <FolderOpen className="h-5 w-5" />
                            </a>
                          ) : (
                            <span className="text-neutral-500 text-sm">-</span>
                          )}
                        </td>

                        {/* Zuletzt aktualisiert */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {formatRelativeTime(video.last_updated || video.updated_at)}
                        </td>

                        {/* Inspiration Quelle */}
                        <td className="py-4 px-4">
                          <EditableCell
                            value={video.inspiration_source}
                            videoId={video.id}
                            field="inspiration_source"
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
                            type="url"
                            placeholder="URL hinzufügen"
                          />
                        </td>

                        {/* Beschreibung */}
                        <td className="py-4 px-4 max-w-xs">
                          <EditableDescription
                            value={video.description}
                            videoId={video.id}
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
                            placeholder="Beschreibung hinzufügen"
                          />
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
                          <EditableDate
                            value={video.publication_date}
                            videoId={video.id}
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
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
                          {video.storage_location ? (
                            <button
                              onClick={() => handleOpenUploadModal(video)}
                              className="p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20"
                              title="Dateien hochladen"
                            >
                              <Upload className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-3 bg-orange-500/10 text-orange-400 rounded-lg cursor-not-allowed border border-orange-500/20"
                              title="Ordner wird erstellt..."
                            >
                              <Loader2 className="h-5 w-5 animate-spin" />
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Speicherort</label>
                          {video.storage_location ? (
                            <a
                              href={video.storage_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors inline-flex items-center"
                              title="Ordner durchsuchen"
                            >
                              <FolderOpen className="h-5 w-5" />
                            </a>
                          ) : (
                            <p className="text-neutral-300">-</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Aktualisiert</label>
                          <p className="text-neutral-300">
                            {formatRelativeTime(video.last_updated || video.updated_at)}
                          </p>
                        </div>
                      </div>

                      {/* Inspiration und Beschreibung */}
                      <div className="space-y-3 pt-2 border-t border-neutral-700">
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Inspiration</label>
                          <EditableCell
                            value={video.inspiration_source}
                            videoId={video.id}
                            field="inspiration_source"
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
                            type="url"
                            placeholder="URL hinzufügen"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-400 mb-1">Beschreibung</label>
                          <EditableDescription
                            value={video.description}
                            videoId={video.id}
                            onSave={handleFieldSave}
                            editable={permissions.canEditVideos}
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
                  <ResponsiblePersonDropdownSimple
                    value={newVideo.responsible_person}
                    onChange={(value) => setNewVideo({ ...newVideo, responsible_person: value })}
                    workspaceOwner={workspaceOwner}
                    workspaceMembers={workspaceMembers}
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
                  <ResponsiblePersonDropdownSimple
                    value={editingVideo.responsible_person || ''}
                    onChange={(value) => setEditingVideo({ ...editingVideo, responsible_person: value })}
                    workspaceOwner={workspaceOwner}
                    workspaceMembers={workspaceMembers}
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
        videoName={uploadModalVideo?.name || ''}
        storageLocation={uploadModalVideo?.storage_location}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
