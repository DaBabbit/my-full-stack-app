'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useSharedWorkspaces } from '@/hooks/useSharedWorkspaces';
import { useSharedWorkspaceVideosQuery, useVideoMutations, type Video } from '@/hooks/useVideosQuery';
import { useRealtimeWorkspaceVideos } from '@/hooks/useRealtimeVideos';
import { useTabFocusRefetch } from '@/hooks/useTabFocusRefetch';
import VideoTableSkeleton from '@/components/VideoTableSkeleton';
import NotificationBell from '@/components/NotificationBell';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ErrorModal from '@/components/ErrorModal';
import EditableCell from '@/components/EditableCell';
import EditableDescription from '@/components/EditableDescription';
import EditableDate from '@/components/EditableDate';
import EditableResponsiblePerson from '@/components/EditableResponsiblePerson';
import ResponsiblePersonAvatar from '@/components/ResponsiblePersonAvatar';
import { ToastContainer, ToastProps } from '@/components/Toast';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Video as VideoIcon,
  Settings,
  Menu,
  X,
  Search,
  User,
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
  Users
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import Image from 'next/image';

interface WorkspacePermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

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
    isFetching
  } = useSharedWorkspaceVideosQuery(ownerId);
  const { 
    updateWorkspaceVideo, 
    updateWorkspaceVideoAsync,
    deleteWorkspaceVideo
  } = useVideoMutations();
  
  // Setup Realtime
  useRealtimeWorkspaceVideos(ownerId);
  
  // 🔥 Force refetch bei Tab-Fokus (zusätzliche Absicherung)
  useTabFocusRefetch();
  
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
  const [permissions, setPermissions] = useState<WorkspacePermissions>({
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false
  });

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

  // Handler für Inline-Editing - Generischer Save Handler
  const handleFieldSave = async (videoId: string, field: string, value: string) => {
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, dieses Video zu bearbeiten'
      });
      return;
    }

    try {
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
  const filteredVideos = videos.filter(video => {
    const videoName = video.name || video.title || '';
    return (
      videoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
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

  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    if (!permissions.can_edit) {
      addToast({
        type: 'error',
        title: 'Keine Berechtigung',
        message: 'Sie haben keine Berechtigung, Videos zu bearbeiten'
      });
      return;
    }

    try {
      updateWorkspaceVideo({
        id: videoId,
        updates: { status: newStatus },
        ownerId
      });
      
      console.log('Status erfolgreich aktualisiert!');
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
              title={sidebarCollapsed ? item.name : ''}
            >
              <item.icon className={`w-5 h-5 ${sidebarCollapsed ? '' : 'flex-shrink-0'}`} />
              {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
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
        {/* Top Bar */}
        <div className="bg-neutral-900/50 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Workspace: {workspaceOwnerName || 'Lädt...'}</h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Desktop Search */}
            <div className="hidden md:block relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-xl focus:ring-white focus:border-white block w-64 pl-10 p-3 placeholder-neutral-400"
                placeholder="Videos suchen..."
              />
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2 p-2 hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <div className="bg-gradient-to-br from-neutral-700 to-neutral-900 rounded-full p-2">
                  <User className="w-5 h-5 text-white" />
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-xl z-50">
                  <div className="p-3 border-b border-neutral-700">
                    <p className="text-sm text-white font-medium">{user?.email}</p>
                    <p className="text-xs text-neutral-400 mt-1">Mitarbeiter</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => router.push('/profile')}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-neutral-400 hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>Profil</span>
                    </button>
                    <button
                      onClick={() => router.push('/pay')}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-neutral-400 hover:bg-neutral-800 rounded-xl transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Abonnement</span>
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Video</th>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Veröffentlichung</th>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Verantwortlich</th>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Speicherort</th>
                          <th className="text-left py-3 px-4 font-medium text-neutral-300">Aktualisiert</th>
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
                              {/* Video Title */}
                              <td className="py-4 px-4">
                                <div className="flex items-center">
                                  <div className="p-2 bg-neutral-800 rounded-lg mr-3">
                                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                  </div>
                                  <p className="text-white font-medium">{video.name}</p>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-4 px-4">
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
                                    <span className="text-neutral-300 text-sm">{video.status}</span>
                                  </div>
                                )}
                              </td>

                              {/* Publication Date */}
                              <td className="py-4 px-4">
                                <EditableDate
                                  value={video.publication_date}
                                  videoId={video.id}
                                  onSave={handleFieldSave}
                                  editable={permissions.can_edit}
                                  placeholder="Datum wählen"
                                />
                              </td>

                              {/* Responsible Person */}
                              <td className="py-4 px-4">
                                <EditableResponsiblePerson
                                  value={video.responsible_person}
                                  videoId={video.id}
                                  onSave={async (videoId, field, value) => {
                                    await handleFieldSave(videoId, field, value);
                                  }}
                                  editable={permissions.can_edit}
                                  workspaceOwner={workspaceOwnerInfo}
                                  workspaceMembers={[]}
                                />
                              </td>

                              {/* Storage Location */}
                              <td className="py-4 px-4 text-neutral-300 text-sm">
                                {video.storage_location ? (
                                  <a
                                    href={video.storage_location}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline flex items-center"
                                  >
                                    Link <ExternalLink className="ml-1 w-3 h-3" />
                                  </a>
                                ) : '-'}
                              </td>

                              {/* Updated Date */}
                              <td className="py-4 px-4 text-neutral-300 text-sm">
                                {formatDate(video.updated_at)}
                              </td>

                              {/* Description */}
                              <td className="py-4 px-4 max-w-xs">
                                <EditableDescription
                                  value={video.description}
                                  videoId={video.id}
                                  onSave={handleFieldSave}
                                  editable={permissions.can_edit}
                                  placeholder="Beschreibung hinzufügen"
                                />
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-4">
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
                              {video.storage_location && (
                                <a
                                  href={video.storage_location}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-white hover:text-neutral-300"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
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
                            {video.updated_at && (
                              <div className="flex justify-between">
                                <span className="text-neutral-400">Aktualisiert:</span>
                                <span className="text-white">{formatDate(video.updated_at)}</span>
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

