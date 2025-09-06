'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Video, 
  Settings, 
  Plus,
  Menu,
  X,
  Search,
  Bell,
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
  Rocket
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
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [newVideo, setNewVideo] = useState({
    name: '',
    status: 'Idee',
    publication_date: '',
    responsible_person: '',
    storage_location: '',
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
  }, [user, router]);

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

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideo.name.trim()) return;

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
      const { error } = await supabase
        .from('videos')
        .insert([
          {
            user_id: currentUser.id,
            title: newVideo.name,
            status: newVideo.status,
            publication_date: newVideo.publication_date || null,
            responsible_person: newVideo.responsible_person || null,
            storage_location: newVideo.storage_location || null,
            inspiration_source: newVideo.inspiration_source || null,
            description: newVideo.description || null,
          }
        ]);

      if (error) {
        console.error('Error creating video:', error);
        alert(`Fehler beim Erstellen des Videos: ${error.message}`);
        return;
      }

      console.log('Video erfolgreich erstellt!');

      // Success - refresh videos and close modal
      fetchVideos();
      setShowAddModal(false);
      setNewVideo({
        name: '',
        status: 'Idee',
        publication_date: '',
        responsible_person: '',
        storage_location: '',
        inspiration_source: '',
        description: ''
      });
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Fehler beim Erstellen des Videos. Bitte versuche es erneut.');
    }
  };

  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: videoId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        fetchVideos();
      }
    } catch (error) {
      console.error('Error updating video:', error);
    }
  };

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

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:block md:ml-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  type="text"
                  className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-white focus:border-white block w-64 pl-10 p-2.5 placeholder-neutral-400"
                  placeholder="Search videos..."
                />
              </div>
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
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-black" />
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
                      <p className="text-xs text-neutral-400">Angemeldet</p>
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
        animate={{ marginLeft: sidebarCollapsed ? '80px' : '256px' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="p-4 ml-0 md:ml-64 pt-24"
      >
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Videos</h1>
            <p className="text-neutral-400">Verwalte deine Video-Projekte und deren Status</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-3xl flex items-center space-x-2 transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Plus className="h-5 w-5" />
            <span>Neues Video</span>
          </button>
        </div>

        {/* Videos Table */}
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-700">
            <h3 className="text-lg font-semibold text-white">Alle Videos</h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-ring loading-lg text-white"></span>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Noch keine Videos</h3>
              <p className="text-neutral-400 mb-4">
                Erstellen Sie Ihr erstes Video, um zu beginnen.
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
            <div className="overflow-x-auto">
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
                  {videos.map((video) => {
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
                          <select
                            value={video.status}
                            onChange={(e) => handleUpdateStatus(video.id, e.target.value)}
                            className="bg-neutral-900/80 backdrop-blur-md border border-neutral-600 text-white text-sm rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-800/80 transition-all duration-200"
                          >
                            <option value="Idee" className="bg-neutral-900 text-white">Idee</option>
                            <option value="Warten auf Aufnahme" className="bg-neutral-900 text-white">Warten auf Aufnahme</option>
                            <option value="In Bearbeitung (Schnitt)" className="bg-neutral-900 text-white">In Bearbeitung (Schnitt)</option>
                            <option value="Schnitt abgeschlossen" className="bg-neutral-900 text-white">Schnitt abgeschlossen</option>
                            <option value="Hochgeladen" className="bg-neutral-900 text-white">Hochgeladen</option>
                          </select>
                        </td>

                        {/* Veröffentlichungsdatum */}
                        <td className="py-4 px-4 text-neutral-300 text-sm">
                          {video.publication_date ? new Date(video.publication_date).toLocaleDateString('de-DE') : '-'}
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
                          {video.last_updated ? new Date(video.last_updated).toLocaleDateString('de-DE') : 
                           video.updated_at ? new Date(video.updated_at).toLocaleDateString('de-DE') : '-'}
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
                              onClick={() => console.log('Edit video:', video.id)}
                              className="text-white hover:text-neutral-300"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            {video.storage_location && (
                              <a
                                href={video.storage_location}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white hover:text-neutral-300"
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
          )}
        </div>
      </motion.main>

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-2xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto"
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
                  <select
                    value={newVideo.status}
                    onChange={(e) => setNewVideo({ ...newVideo, status: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-900/80 backdrop-blur-md border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-800/80 transition-all duration-200"
                  >
                    <option value="Idee" className="bg-neutral-900 text-white">Idee</option>
                    <option value="Warten auf Aufnahme" className="bg-neutral-900 text-white">Warten auf Aufnahme</option>
                    <option value="In Bearbeitung (Schnitt)" className="bg-neutral-900 text-white">In Bearbeitung (Schnitt)</option>
                    <option value="Schnitt abgeschlossen" className="bg-neutral-900 text-white">Schnitt abgeschlossen</option>
                    <option value="Hochgeladen" className="bg-neutral-900 text-white">Hochgeladen</option>
                  </select>
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
                <div>
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

                {/* Speicherort */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Speicherort
                  </label>
                  <input
                    type="url"
                    value={newVideo.storage_location}
                    onChange={(e) => setNewVideo({ ...newVideo, storage_location: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                    placeholder="https://drive.google.com/..."
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
        </div>
      )}

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
