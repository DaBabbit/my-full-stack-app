'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

interface Video {
  id: string;
  name: string;
  status: string;
  storage_location?: string;
  created_at: string;
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
  },
  {
    name: 'Settings',
    icon: Settings,
    href: '/profile',
    active: false
  }
];


export default function VideosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVideoName, setNewVideoName] = useState('');
  const [newVideoStatus, setNewVideoStatus] = useState('Idee');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchVideos();
  }, [user, router]);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoName.trim()) return;

    try {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVideoName,
          status: newVideoStatus,
        }),
      });

      if (response.ok) {
        fetchVideos();
        setShowAddModal(false);
        setNewVideoName('');
        setNewVideoStatus('Idee');
      }
    } catch (error) {
      console.error('Error adding video:', error);
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
            <div className="flex items-center">
              <button className="flex items-center space-x-2 text-white hover:bg-neutral-800 rounded-lg p-2 transition-colors">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-black" />
                </div>
                <span className="hidden md:block text-sm">{user.email}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-neutral-900 border-r border-neutral-800 md:translate-x-0`}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          {/* Navigation Items */}
          <ul className="space-y-2 font-medium">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => router.push(item.href)}
                  className={`flex items-center p-2 rounded-lg w-full text-left transition-colors ${
                    item.active 
                      ? 'bg-white text-black' 
                      : 'text-white hover:bg-neutral-800'
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${item.active ? 'text-black' : 'text-neutral-400'} transition-colors group-hover:text-white`} />
                  <span className="ml-3">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:ml-64 pt-20">
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
                    <th className="text-left py-3 px-6 font-medium text-neutral-300">Name</th>
                    <th className="text-left py-3 px-6 font-medium text-neutral-300">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-neutral-300">Erstellt</th>
                    <th className="text-left py-3 px-6 font-medium text-neutral-300">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-neutral-800 hover:bg-neutral-800/30">
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Video className="h-5 w-5 text-neutral-400 mr-3" />
                          <span className="text-white font-medium">{video.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <select
                            value={video.status}
                            onChange={(e) => handleUpdateStatus(video.id, e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-1 mr-2"
                          >
                            <option value="Idee">Idee</option>
                            <option value="Warten auf Aufnahme">Warten auf Aufnahme</option>
                            <option value="In Bearbeitung (Schnitt)">In Bearbeitung (Schnitt)</option>
                            <option value="Schnitt abgeschlossen">Schnitt abgeschlossen</option>
                            <option value="Hochgeladen">Hochgeladen</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-neutral-400">
                        {new Date(video.created_at).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-4 px-6">
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700">
            <h3 className="text-xl font-semibold mb-4 text-white">Neues Video erstellen</h3>
            <form onSubmit={handleAddVideo}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Video Name
                </label>
                <input
                  type="text"
                  value={newVideoName}
                  onChange={(e) => setNewVideoName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                  placeholder="z.B. Mein neues Video"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Status
                </label>
                <select
                  value={newVideoStatus}
                  onChange={(e) => setNewVideoStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white"
                >
                  <option value="Idee">Idee</option>
                  <option value="Warten auf Aufnahme">Warten auf Aufnahme</option>
                  <option value="In Bearbeitung (Schnitt)">In Bearbeitung (Schnitt)</option>
                  <option value="Schnitt abgeschlossen">Schnitt abgeschlossen</option>
                  <option value="Hochgeladen">Hochgeladen</option>
                </select>
              </div>
              <div className="flex gap-4 justify-end">
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
                  Erstellen
                </button>
              </div>
            </form>
          </div>
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
