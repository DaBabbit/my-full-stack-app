"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { motion } from 'framer-motion';
import { 
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Lightbulb,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Upload
} from 'lucide-react';

const AUTH_TIMEOUT = 15000; // 15 seconds

// Status-Icons für bessere Visualisierung
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Warten auf Aufnahme':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'Idee':
      return <Lightbulb className="h-4 w-4 text-blue-500" />;
    case 'In Bearbeitung (Schnitt)':
      return <Edit className="h-4 w-4 text-orange-500" />;
    case 'Schnitt abgeschlossen':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Hochgeladen':
      return <Upload className="h-4 w-4 text-purple-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

// Status-Farben für Badges
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Warten auf Aufnahme':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Idee':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'In Bearbeitung (Schnitt)':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Schnitt abgeschlossen':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Hochgeladen':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

interface Video {
  id: string;
  title: string;
  status: string;
  publication_date: string | null;
  responsible_person: string | null;
  storage_location: string | null;
  inspiration_source: string | null;
  description: string | null;
  last_updated: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, isSubscriber, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { subscription, isLoading: isSubLoading, fetchSubscription } = useSubscription();
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const { isInTrial, isLoading: isTrialLoading } = useTrialStatus();
  const [authTimeout, setAuthTimeout] = useState(false);
  
  // Video-Management States
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // First check - Subscription and trial check
  useEffect(() => {
    if (isSubLoading || isTrialLoading) return;
    
    const hasValidSubscription = ['active', 'trialing'].includes(subscription?.status || '');
    
    console.log('Access check isInTrial:', {
      hasSubscription: !!subscription,
      status: subscription?.status,
      isInTrial: isInTrial,
      validUntil: subscription?.current_period_end
    });

    // Only redirect if there's no valid subscription AND no valid trial
    if (!hasValidSubscription && !isInTrial) {
      console.log('No valid subscription or trial, redirecting');
      router.replace('/profile');
    }
  }, [subscription, isSubLoading, isTrialLoading, router, isInTrial]);

  // Second check - Auth check
  useEffect(() => {
    if (isAuthLoading || isTrialLoading) return;

    console.log('Access check:', {
      isSubscriber,
      hasCheckedSubscription,
      isInTrial: isInTrial,
      authLoading: isAuthLoading,
    });

    if (!hasCheckedSubscription) {
      setHasCheckedSubscription(true);
      
      // Allow access for both subscribers and trial users
      if (!user || (!isSubscriber && !isInTrial && !isAuthLoading)) {
        console.log('No valid subscription or trial, redirecting');
        router.replace('/profile');
      }
    }
  }, [isSubscriber, isAuthLoading, hasCheckedSubscription, router, user, subscription, isTrialLoading, isInTrial]);

  // Add refresh effect
  useEffect(() => {
    const refreshSubscription = async () => {
      await fetchSubscription();
      setHasCheckedSubscription(true);
    };
    
    if (user?.id) {
      refreshSubscription();
    }
  }, [user?.id, fetchSubscription]);

  // Load videos for the current user
  useEffect(() => {
    const fetchVideos = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('user_id', user.id)
          .order('last_updated', { ascending: false });
        
        if (error) {
          console.error('Error fetching videos:', error);
        } else {
          setVideos(data || []);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!user && (isAuthLoading || isTrialLoading)) {
        setAuthTimeout(true);
      }
    }, AUTH_TIMEOUT);
    
    return () => clearTimeout(timer);
  }, [user, isAuthLoading, isTrialLoading]);

  // Update video status
  const updateVideoStatus = async (videoId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: newStatus, 
          last_updated: new Date().toISOString() 
        })
        .eq('id', videoId);
      
      if (error) {
        console.error('Error updating video status:', error);
        return;
      }
      
      // Update local state
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === videoId 
            ? { ...video, status: newStatus, last_updated: new Date().toISOString() }
            : video
        )
      );
    } catch (error) {
      console.error('Error updating video status:', error);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Video löschen möchten?')) return;
    
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (error) {
        console.error('Error deleting video:', error);
        return;
      }
      
      // Update local state
      setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  // Update the loading check
  if (!user && (isAuthLoading || isTrialLoading) && !hasCheckedSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4 mx-auto"></div>
          <p className="text-foreground">
            {authTimeout ? 
              "Taking longer than usual? Try refreshing the page 😊." :
              "Verifying access..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Dashboard Header */}
      <div className="bg-neutral-900/50 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                🎬 Mein Content-Planer
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                Verwalten Sie Ihre Videos und Content-Planung
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-neutral-800 hover:bg-white hover:text-black text-white px-6 py-3 rounded-3xl flex items-center space-x-2 transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Plus className="h-4 w-4" />
                <span>Neues Video</span>
              </button>
              <span className="text-sm text-neutral-400">
                {isInTrial ? "Trial Period" : "Premium Plan"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <PlayCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {videos.length}
            </h3>
            <p className="text-sm text-neutral-400">
              Gesamt Videos
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {videos.filter(v => v.status === 'Warten auf Aufnahme').length}
            </h3>
            <p className="text-sm text-neutral-400">
              Warten auf Aufnahme
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <Edit className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {videos.filter(v => v.status === 'In Bearbeitung (Schnitt)').length}
            </h3>
            <p className="text-sm text-neutral-400">
              In Bearbeitung
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 bg-neutral-800 rounded-lg">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-bold text-white">
              {videos.filter(v => v.status === 'Hochgeladen').length}
            </h3>
            <p className="text-sm text-neutral-400">
              Hochgeladen
            </p>
          </motion.div>
        </div>

        {/* Videos Table */}
        <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-700">
            <h3 className="text-lg font-semibold text-white">
              Meine Videos
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-neutral-400">Lade Videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-8 text-center">
              <PlayCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Noch keine Videos
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Erstellen Sie Ihr erstes Video, um zu beginnen.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 mx-auto transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Erstes Video erstellen</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Video
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Veröffentlichung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Verantwortlich
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Zuletzt aktualisiert
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-dark divide-y divide-slate-200 dark:divide-slate-700">
                  {videos.map((video, index) => (
                    <motion.tr
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {video.title}
                          </div>
                          {video.description && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                              {video.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(video.status)}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(video.status)}`}>
                            {video.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {video.publication_date ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>{new Date(video.publication_date).toLocaleDateString('de-DE')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Nicht geplant</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                        {video.responsible_person ? (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-slate-400" />
                            <span>{video.responsible_person}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Nicht zugewiesen</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {new Date(video.last_updated).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <select
                            value={video.status}
                            onChange={(e) => updateVideoStatus(video.id, e.target.value)}
                            className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          >
                            <option value="Warten auf Aufnahme">Warten auf Aufnahme</option>
                            <option value="Idee">Idee</option>
                            <option value="In Bearbeitung (Schnitt)">In Bearbeitung (Schnitt)</option>
                            <option value="Schnitt abgeschlossen">Schnitt abgeschlossen</option>
                            <option value="Hochgeladen">Hochgeladen</option>
                          </select>
                          
                          <button
                            onClick={() => setEditingVideo(video)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {video.storage_location && (
                            <a
                              href={video.storage_location}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          
                          {video.inspiration_source && (
                            <a
                              href={video.inspiration_source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            >
                              <Lightbulb className="h-4 w-4" />
                            </a>
                          )}
                          
                          <button
                            onClick={() => deleteVideo(video.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Video Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Neues Video erstellen
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Diese Funktion wird bald verfügbar sein!
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal - Placeholder */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-dark rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Video bearbeiten: {editingVideo.title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Diese Funktion wird bald verfügbar sein!
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}