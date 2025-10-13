'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Clock, Scissors, Check, Rocket } from 'lucide-react';

interface Video {
  status: string;
}

interface VideoStatusChartProps {
  videos: Video[];
}

export default function VideoStatusChart({ videos }: VideoStatusChartProps) {
  // Status-Konfiguration mit Icons, Farben und Labels
  const statusConfig = [
    {
      status: 'Idee',
      icon: Lightbulb,
      color: 'bg-gray-500',
      borderColor: 'border-gray-500',
      textColor: 'text-gray-400',
      label: 'Idee'
    },
    {
      status: 'Warten auf Aufnahme',
      icon: Clock,
      color: 'bg-red-500',
      borderColor: 'border-red-500',
      textColor: 'text-red-400',
      label: 'Warten auf Aufnahme'
    },
    {
      status: 'In Bearbeitung (Schnitt)',
      icon: Scissors,
      color: 'bg-purple-500',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-400',
      label: 'In Bearbeitung'
    },
    {
      status: 'Schnitt abgeschlossen',
      icon: Check,
      color: 'bg-blue-500',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-400',
      label: 'Schnitt abgeschlossen'
    },
    {
      status: 'Hochgeladen',
      icon: Rocket,
      color: 'bg-green-500',
      borderColor: 'border-green-500',
      textColor: 'text-green-400',
      label: 'Hochgeladen'
    }
  ];

  // Zähle Videos pro Status
  const statusCounts = statusConfig.map(config => ({
    ...config,
    count: videos.filter(v => v.status === config.status).length
  }));

  // Finde Maximum für Skalierung
  const maxCount = Math.max(...statusCounts.map(s => s.count), 1);

  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Video-Status Übersicht</h2>
        <p className="text-sm text-neutral-400">Anzahl der Videos pro Status</p>
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {statusCounts.map((status, index) => {
          const StatusIcon = status.icon;
          const widthPercentage = maxCount > 0 ? (status.count / maxCount) * 100 : 0;

          return (
            <motion.div
              key={status.status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Label + Icon */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-[180px]">
                  <div className={`p-1.5 rounded-lg ${status.color}/10 border ${status.borderColor}/30`}>
                    <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
                  </div>
                  <span className="text-sm font-medium text-neutral-300 truncate">
                    {status.label}
                  </span>
                </div>
                
                {/* Count */}
                <span className="text-sm font-bold text-white ml-2">
                  {status.count}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-8 bg-neutral-800/50 rounded-lg overflow-hidden border border-neutral-700/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                  className={`h-full ${status.color}/80 relative`}
                >
                  {/* Shine effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent`} />
                </motion.div>
                
                {/* Count inside bar (if wide enough) */}
                {widthPercentage > 15 && (
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-bold text-white">
                      {status.count} {status.count === 1 ? 'Video' : 'Videos'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-6 pt-4 border-t border-neutral-700/50 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-400">Gesamt</span>
        <span className="text-lg font-bold text-white">{videos.length} Videos</span>
      </div>
    </div>
  );
}

