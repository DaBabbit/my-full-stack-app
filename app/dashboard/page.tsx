'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SubscriptionWarning from '@/components/SubscriptionWarning';
import DashboardSkeleton from '@/components/DashboardSkeleton';
import NotificationBell from '@/components/NotificationBell';
import VideoStatusChart from '@/components/VideoStatusChart';
import StatusFilterModal from '@/components/StatusFilterModal';
import { usePermissions } from '@/hooks/usePermissions';
import { useSharedWorkspaces } from '@/hooks/useSharedWorkspaces';
import { useVideosQuery, useVideoMutations } from '@/hooks/useVideosQuery';
import { useRealtimeVideos } from '@/hooks/useRealtimeVideos';
import { useTabFocusRefetch } from '@/hooks/useTabFocusRefetch';
import { useUserProfile } from '@/hooks/useUserProfile';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video as VideoIcon, 
  Settings,
  Menu,
  X,
  User,
  LogOut,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Users,
  FolderOpen,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

// Funktion für relative Zeitangaben
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'vor wenigen Sekunden';
  if (diffMins === 1) return 'vor 1 Minute';
  if (diffMins < 60) return `vor ${diffMins} Minuten`;
  if (diffHours === 1) return 'vor 1 Stunde';
  if (diffHours < 24) return `vor ${diffHours} Stunden`;
  if (diffDays === 1) return 'vor 1 Tag';
  if (diffDays < 4) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE');
}

// Funktion um Initialen zu generieren
function getInitials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const sidebarBottomItems = [
  {
    name: 'Settings',
    icon: Settings,
    href: '/profile',
    active: false
  }
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const permissions = usePermissions();
  const { sharedWorkspaces } = useSharedWorkspaces();
  const { profile } = useUserProfile(); // User-Profil mit main_storage_location
  
  // React Query für Videos
  const { data: videos = [], isLoading } = useVideosQuery(user?.id);
  
  // Setup Realtime
  useRealtimeVideos(user?.id);
  
  // 🔥 Force refetch bei Tab-Fokus (zusätzliche Absicherung)
  useTabFocusRefetch();
  
  // Dynamic sidebar items including shared workspaces
  const sidebarItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      active: true
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
        active: false
      };
    })
  ];
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Video mutations
  const { updateVideo, deleteVideo } = useVideoMutations();


  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
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


  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
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
                  onClick={() => {
                    if (item.href !== '/dashboard') {
                      router.push(item.href);
                    }
                  }}
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
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Content Planner</h1>
              <p className="text-neutral-400">Willkommen zurück! Hier ist deine Content-Übersicht.</p>
              
              {/* Subscription Warning */}
              <SubscriptionWarning className="mt-6" />
            </div>

            {/* Video Status Chart */}
            <div className="mb-8">
              <VideoStatusChart 
                videos={videos}
                onStatusClick={(status) => {
                  setSelectedStatus(status);
                  setFilterModalOpen(true);
                }}
              />
            </div>

        {/* Quick Actions */}
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Schnellaktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Hauptspeicherort */}
            {profile?.main_storage_location ? (
              <a
                href={profile.main_storage_location}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                title="Verwalten Sie all Ihre Dateien"
              >
                <FolderOpen className="w-6 h-6 mr-3" />
                <span>Speicherort</span>
              </a>
            ) : (
              <div className="flex flex-col p-4 bg-orange-900/20 border-2 border-orange-500/30 rounded-2xl">
                <div className="flex items-center mb-3">
                  <div className="relative mr-3">
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                  </div>
                  <span className="font-medium text-orange-300">Hauptspeicherort wird erstellt</span>
                </div>
                <p className="text-sm text-orange-200/80 mb-3">
                  Gib unter Profile deinen Vor- und Nachnamen an
                </p>
                <button
                  onClick={() => router.push('/profile')}
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium underline text-left flex items-center"
                >
                  → Zum Profil
                </button>
              </div>
            )}
            
            <button
              onClick={() => router.push('/dashboard/videos')}
              className="flex items-center p-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <VideoIcon className="w-6 h-6 mr-3" />
              <span>Alle Videos anzeigen</span>
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="flex items-center p-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Settings className="w-6 h-6 mr-3" />
              <span>Einstellungen</span>
            </button>
            </div>
          </div>

          {/* Recent Activity */}
            <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700">
              <h2 className="text-xl font-semibold text-white mb-4">Letzte Aktivitäten</h2>
              {videos.length > 0 ? (
            <div className="space-y-4">
              {videos
                .sort((a, b) => {
                  const aTime = new Date(a.updated_at || a.last_updated || a.created_at).getTime();
                  const bTime = new Date(b.updated_at || b.last_updated || b.created_at).getTime();
                  return bTime - aTime;
                })
                .slice(0, 5)
                .map((video) => {
                  const updatedAt = video.updated_at || video.last_updated || video.created_at;
                  
                  // Namen vom User-Profil (public.users) nutzen
                  const userFirstname = profile?.firstname || user?.user_metadata?.firstname || '';
                  const userLastname = profile?.lastname || user?.user_metadata?.lastname || '';
                  const userName = userLastname || userFirstname || user?.email?.split('@')[0] || 'Du';
                  
                  return (
                    <div key={video.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                      <div className="flex items-center flex-1 min-w-0 w-full sm:w-auto">
                        <div className="p-2 bg-neutral-700 rounded-lg mr-4 flex-shrink-0">
                          <VideoIcon className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{video.name}</h3>
                          <p className="text-sm text-neutral-400">Status: {video.status}</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-neutral-700 rounded-full flex items-center justify-center text-xs text-white font-medium flex-shrink-0">
                            {getInitials(`${userFirstname} ${userLastname}`.trim())}
                          </div>
                          <span className="text-xs text-neutral-400 truncate max-w-[150px]">{userName}</span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {formatRelativeTime(updatedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <VideoIcon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400 mb-4">Noch keine Videos erstellt</p>
              <button
                onClick={() => router.push('/dashboard/videos')}
                className="px-6 py-3 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-3xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Erstes Video erstellen
              </button>
              </div>
              )}
            </div>
          </>
        )}
      </motion.main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Status Filter Modal */}
      <StatusFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        status={selectedStatus}
        videos={videos}
        onFieldSave={async (videoId, field, value) => {
          updateVideo({ id: videoId, updates: { [field]: value } });
        }}
        onDelete={async (videoId) => {
          deleteVideo(videoId);
        }}
        canEdit={permissions.canEditVideos}
        canDelete={permissions.canDeleteVideos}
      />
    </div>
  );
}