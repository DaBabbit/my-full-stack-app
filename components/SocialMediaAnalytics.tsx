'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  MousePointer, 
  Loader2,
  Youtube,
  Instagram,
  Facebook,
  Video as TikTok,
  Linkedin,
  Twitter,
  Share2,
  ExternalLink
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SocialMediaPost {
  platform: string;
  impressions: number;
  engagement: number;
  clicks: number;
  status: string;
}

interface SocialMediaAccount {
  id: string;
  platform: string;
  platform_username: string;
  is_active: boolean;
}

const platformConfig = {
  youtube: { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  instagram: { name: 'Instagram', icon: Instagram, color: '#E1306C' },
  facebook: { name: 'Facebook', icon: Facebook, color: '#1877F2' },
  tiktok: { name: 'TikTok', icon: TikTok, color: '#00F2EA' },
  linkedin: { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  twitter: { name: 'X', icon: Twitter, color: '#1DA1F2' }
};

export default function SocialMediaAnalytics() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SocialMediaAccount[]>([]);
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoAccounts, setHasNoAccounts] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      // Load accounts
      const accountsResponse = await fetch('/api/social-media/accounts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const accountsData = await accountsResponse.json();
      
      if (accountsData.success) {
        const activeAccounts = accountsData.accounts.filter((acc: SocialMediaAccount) => acc.is_active);
        setAccounts(activeAccounts);
        setHasNoAccounts(activeAccounts.length === 0);
      }

      // Load posts
      const postsResponse = await fetch('/api/social-media/posts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const postsData = await postsResponse.json();
      
      if (postsData.success) {
        setPosts(postsData.posts.filter((p: SocialMediaPost) => p.status === 'published'));
      }
    } catch (error) {
      console.error('Error loading social media data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Aggregate metrics by platform
  const platformMetrics = React.useMemo(() => {
    const metrics: Record<string, { impressions: number; engagement: number; clicks: number }> = {};
    
    posts.forEach(post => {
      if (!metrics[post.platform]) {
        metrics[post.platform] = { impressions: 0, engagement: 0, clicks: 0 };
      }
      metrics[post.platform].impressions += post.impressions;
      metrics[post.platform].engagement += post.engagement;
      metrics[post.platform].clicks += post.clicks;
    });
    
    return metrics;
  }, [posts]);

  // Calculate totals
  const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
  const totalEngagement = posts.reduce((sum, p) => sum + p.engagement, 0);
  const totalClicks = posts.reduce((sum, p) => sum + p.clicks, 0);

  // Chart data
  const chartData = {
    labels: Object.keys(platformMetrics).map(p => platformConfig[p as keyof typeof platformConfig]?.name || p),
    datasets: [
      {
        label: 'Impressionen',
        data: Object.values(platformMetrics).map(m => m.impressions),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8
      },
      {
        label: 'Engagement',
        data: Object.values(platformMetrics).map(m => m.engagement),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        borderRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#a3a3a3',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(23, 23, 23, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#a3a3a3',
        borderColor: '#404040',
        borderWidth: 1,
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#a3a3a3' }
      },
      y: {
        grid: { color: 'rgba(64, 64, 64, 0.3)' },
        ticks: { color: '#a3a3a3' }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart' as const
    }
  };

  if (isLoading) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 h-full">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (hasNoAccounts) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-md rounded-3xl p-6 border border-blue-500/30 h-full flex flex-col items-center justify-center text-center"
      >
        <div className="p-4 bg-blue-500/10 rounded-2xl mb-4">
          <Share2 className="w-12 h-12 text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Keine Social Media Accounts verbunden
        </h3>
        <p className="text-neutral-300 mb-6 max-w-md">
          Verbinde deine Social Media Accounts, um Analytics zu sehen und Videos automatisch zu veröffentlichen
        </p>
        <a
          href="/profile/social-media"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Accounts verbinden
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Social Media Analytics</h2>
        </div>
        <a
          href="/profile/social-media/analytics"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <span>Details</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-400 mb-2">Noch keine Posts veröffentlicht</p>
          <p className="text-sm text-neutral-500">
            Veröffentliche dein erstes Video auf Social Media!
          </p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-neutral-800/50 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <p className="text-xs text-neutral-400">Impressionen</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalImpressions.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-neutral-800/50 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-green-400" />
                <p className="text-xs text-neutral-400">Engagement</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalEngagement.toLocaleString()}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-neutral-800/50 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="w-4 h-4 text-purple-400" />
                <p className="text-xs text-neutral-400">Klicks</p>
              </div>
              <p className="text-2xl font-bold text-white">{totalClicks.toLocaleString()}</p>
            </motion.div>
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="h-64"
          >
            <Bar data={chartData} options={chartOptions} />
          </motion.div>

          {/* Connected Platforms */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <p className="text-xs text-neutral-400">Verbunden:</p>
            {accounts.map(account => {
              const Icon = platformConfig[account.platform as keyof typeof platformConfig]?.icon || Share2;
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-1 px-2 py-1 bg-neutral-800/50 rounded-lg"
                  title={account.platform_username}
                >
                  <Icon className="w-3 h-3 text-neutral-400" />
                  <span className="text-xs text-neutral-400">{account.platform_username}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}

