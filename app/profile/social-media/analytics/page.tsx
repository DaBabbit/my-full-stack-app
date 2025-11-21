'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Eye,
  Heart,
  MousePointer,
  Calendar,
  Youtube,
  Instagram,
  Facebook,
  Video,
  Linkedin,
  Twitter,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface SocialMediaPost {
  id: string;
  video_id: string;
  platform: string;
  post_url: string | null;
  status: string;
  caption: string;
  scheduled_at: string;
  published_at: string | null;
  impressions: number;
  engagement: number;
  clicks: number;
  error_message: string | null;
  created_at: string;
}

const platformConfig = {
  youtube: { name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  instagram: { name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  facebook: { name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  tiktok: { name: 'TikTok', icon: Video, color: 'text-cyan-500' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  twitter: { name: 'X', icon: Twitter, color: 'text-gray-400' }
};

const statusConfig = {
  scheduled: { label: 'Geplant', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  publishing: { label: 'Veröffentlicht...', icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  published: { label: 'Veröffentlicht', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  failed: { label: 'Fehlgeschlagen', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' }
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | string>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadPosts();
  }, [user, router]);

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/social-media/posts');
      const data = await response.json();

      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      // Trigger sync from Mixpost
      await fetch('/api/social-media/sync', { method: 'POST' });
      await loadPosts();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(p => p.platform === filter);

  const totalImpressions = filteredPosts.reduce((sum, p) => sum + p.impressions, 0);
  const totalEngagement = filteredPosts.reduce((sum, p) => sum + p.engagement, 0);
  const totalClicks = filteredPosts.reduce((sum, p) => sum + p.clicks, 0);
  const publishedCount = filteredPosts.filter(p => p.status === 'published').length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/profile/social-media')}
              className="text-neutral-400 hover:text-white mb-4 flex items-center gap-2 transition-colors"
            >
              ← Zurück
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-neutral-400">
              Übersicht aller Social Media Posts und Performance Metriken
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-neutral-400 text-sm">Impressionen</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalImpressions.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Heart className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-neutral-400 text-sm">Engagement</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalEngagement.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MousePointer className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-neutral-400 text-sm">Klicks</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalClicks.toLocaleString()}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <span className="text-neutral-400 text-sm">Veröffentlicht</span>
            </div>
            <p className="text-3xl font-bold text-white">{publishedCount}</p>
          </motion.div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Alle
          </button>
          {Object.entries(platformConfig).map(([platform, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={platform}
                onClick={() => setFilter(platform)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === platform
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {config.name}
              </button>
            );
          })}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-400 mb-4">Noch keine Posts veröffentlicht</p>
            <button
              onClick={() => router.push('/dashboard/videos')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Erstes Video veröffentlichen
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map((post, index) => {
              const platform = platformConfig[post.platform as keyof typeof platformConfig];
              const status = statusConfig[post.status as keyof typeof statusConfig];
              const Icon = platform?.icon || Video;
              const StatusIcon = status?.icon || Clock;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-800 rounded-lg">
                        <Icon className={`w-5 h-5 ${platform?.color || 'text-neutral-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{platform?.name || post.platform}</h3>
                        <p className="text-sm text-neutral-400">
                          {new Date(post.published_at || post.scheduled_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${status?.bg || 'bg-neutral-800'}`}>
                      <StatusIcon className={`w-4 h-4 ${status?.color || 'text-neutral-400'} ${post.status === 'publishing' ? 'animate-spin' : ''}`} />
                      <span className={`text-sm ${status?.color || 'text-neutral-400'}`}>
                        {status?.label || post.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-neutral-300 text-sm mb-4 line-clamp-2">{post.caption}</p>

                  {post.status === 'published' && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{post.impressions.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">Impressionen</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{post.engagement.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">Engagement</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{post.clicks.toLocaleString()}</p>
                        <p className="text-xs text-neutral-400">Klicks</p>
                      </div>
                    </div>
                  )}

                  {post.error_message && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-400">{post.error_message}</p>
                    </div>
                  )}

                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Post ansehen
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

