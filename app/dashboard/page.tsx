'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SubscriptionWarning from '@/components/SubscriptionWarning';
import { usePermissions } from '@/hooks/usePermissions';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video, 
  Settings,
  Plus,
  Menu,
  X,
  Bell,
  User,
  PlayCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  LogOut,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Scissors,
  Check,
  Rocket,
  Crown
} from 'lucide-react';
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
}

const sidebarItems = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    active: true
  },
  {
    name: 'Videos',
    icon: Video,
    href: '/dashboard/videos',
    active: false
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

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const permissions = usePermissions();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      const channel = supabase
        .channel('dashboard_videos_realtime')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Dashboard realtime update received:', payload);
            
            if (payload.eventType === 'INSERT') {
              // New video was created
              const newVideo = payload.new as {
                id: string;
                title: string;
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
              };
              const transformedNewVideo = {
                id: newVideo.id,
                name: newVideo.title,
                status: newVideo.status,
                storage_location: newVideo.storage_location,
                created_at: newVideo.created_at,
                publication_date: newVideo.publication_date,
                responsible_person: newVideo.responsible_person,
                inspiration_source: newVideo.inspiration_source,
                description: newVideo.description,
                last_updated: newVideo.last_updated,
                updated_at: newVideo.updated_at,
                duration: newVideo.duration,
                file_size: newVideo.file_size,
                format: newVideo.format,
                thumbnail_url: newVideo.thumbnail_url
              };
              
              setVideos(prevVideos => {
                // Check if video already exists
                const exists = prevVideos.some(v => v.id === newVideo.id);
                if (exists) return prevVideos;
                return [transformedNewVideo, ...prevVideos];
              });
            } else if (payload.eventType === 'UPDATE') {
              // Video was updated
              const updatedVideo = payload.new as {
                id: string;
                title: string;
                status: string;
                storage_location?: string;
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
              };
              setVideos(prevVideos =>
                prevVideos.map(video =>
                  video.id === updatedVideo.id
                    ? {
                        ...video,
                        name: updatedVideo.title,
                        status: updatedVideo.status,
                        storage_location: updatedVideo.storage_location,
                        publication_date: updatedVideo.publication_date,
                        responsible_person: updatedVideo.responsible_person,
                        inspiration_source: updatedVideo.inspiration_source,
                        description: updatedVideo.description,
                        last_updated: updatedVideo.last_updated,
                        updated_at: updatedVideo.updated_at,
                        duration: updatedVideo.duration,
                        file_size: updatedVideo.file_size,
                        format: updatedVideo.format,
                        thumbnail_url: updatedVideo.thumbnail_url
                      }
                    : video
                )
              );
            } else if (payload.eventType === 'DELETE') {
              // Video was deleted
              const deletedVideo = payload.old as { id: string };
              setVideos(prevVideos =>
                prevVideos.filter(video => video.id !== deletedVideo.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('Dashboard realtime subscription status:', status);
        });
      
      return channel;
    };
    
    const channelPromise = setupRealtimeSubscription();
    
    // Also refresh on visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Dashboard tab became visible, refreshing data...');
        fetchVideos();
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

  const fetchVideos = async () => {
    try {
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Fetch videos directly from Supabase
      const { data: videos, error } = await supabase
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
          thumbnail_url
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        return;
      }

      // Transform data to match interface
      const transformedVideos = videos?.map(video => ({
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
        thumbnail_url: video.thumbnail_url
      })) || [];

      setVideos(transformedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoStats = () => {
    const total = videos.length;
    const inProduction = videos.filter(v => v.status === 'In Bearbeitung (Schnitt)').length;
    const completed = videos.filter(v => v.status === 'Hochgeladen').length;
    const ideas = videos.filter(v => v.status === 'Idee').length;

    return { total, inProduction, completed, ideas };
  };

  const stats = getVideoStats();

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
            <button className="p-2 text-neutral-400 rounded-lg hover:text-white hover:bg-neutral-800 transition-colors">
              <Bell className="w-6 h-6" />
            </button>

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content Planner</h1>
          <p className="text-neutral-400">Willkommen zurück! Hier ist deine Content-Übersicht.</p>
          
          {/* Subscription Warning */}
          <SubscriptionWarning className="mt-6" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Videos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">Gesamt Videos</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="p-3 bg-neutral-800 rounded-lg">
                <PlayCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          {/* In Production */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">In Bearbeitung</p>
                <p className="text-3xl font-bold text-white">{stats.inProduction}</p>
              </div>
              <div className="p-3 bg-neutral-800 rounded-lg">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Completed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">Hochgeladen</p>
                <p className="text-3xl font-bold text-white">{stats.completed}</p>
              </div>
              <div className="p-3 bg-neutral-800 rounded-lg">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Ideas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400 mb-1">Ideen</p>
                <p className="text-3xl font-bold text-white">{stats.ideas}</p>
              </div>
              <div className="p-3 bg-neutral-800 rounded-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Schnellaktionen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/videos')}
              className="flex items-center p-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Plus className="w-6 h-6 mr-3" />
              <span>Neues Video erstellen</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/videos')}
              className="flex items-center p-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-2xl transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Video className="w-6 h-6 mr-3" />
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-ring loading-md text-white"></span>
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-4">
              {videos.slice(0, 5).map((video) => {
                const statusInfo = getStatusIcon(video.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div key={video.id} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
                    <div className="flex items-center">
                      <div className="p-2 bg-neutral-700 rounded-lg mr-4">
                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{video.name}</h3>
                        <p className="text-sm text-neutral-400">Status: {video.status}</p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {new Date(video.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
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
      </motion.main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}