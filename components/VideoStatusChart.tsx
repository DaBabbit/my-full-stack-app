'use client';

import { motion } from 'framer-motion';
import { Lightbulb, Clock, Scissors, Check, Rocket } from 'lucide-react';

interface Video {
  status: string;
}

interface VideoStatusChartProps {
  videos: Video[];
  onStatusClick?: (status: string) => void;
}

export default function VideoStatusChart({ videos, onStatusClick }: VideoStatusChartProps) {
  // Status-Konfiguration mit Icons, Farben und Labels
  const statusConfig = [
    {
      status: 'Idee',
      icon: Lightbulb,
      color: 'gray',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-500/30',
      hoverColor: 'hover:bg-gray-500/30',
      textColor: 'text-gray-400',
      label: 'Idee'
    },
    {
      status: 'Warten auf Aufnahme',
      icon: Clock,
      color: 'red',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      hoverColor: 'hover:bg-red-500/30',
      textColor: 'text-red-400',
      label: 'Warten auf Aufnahme'
    },
    {
      status: 'In Bearbeitung (Schnitt)',
      icon: Scissors,
      color: 'purple',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      hoverColor: 'hover:bg-purple-500/30',
      textColor: 'text-purple-400',
      label: 'In Bearbeitung'
    },
    {
      status: 'Schnitt abgeschlossen',
      icon: Check,
      color: 'blue',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      hoverColor: 'hover:bg-blue-500/30',
      textColor: 'text-blue-400',
      label: 'Schnitt abgeschlossen'
    },
    {
      status: 'Hochgeladen',
      icon: Rocket,
      color: 'green',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      hoverColor: 'hover:bg-green-500/30',
      textColor: 'text-green-400',
      label: 'Hochgeladen'
    }
  ];

  // Zähle Videos pro Status
  const statusCounts = statusConfig.map(config => ({
    ...config,
    count: videos.filter(v => v.status === config.status).length
  }));

  // Berechne dynamische Breite basierend auf absoluter Anzahl
  // Min: 15%, Max: 100%, Skalierung: 1 Video = 15%, jedes weitere +8.5%
  const calculateWidth = (count: number) => {
    if (count === 0) return 10; // Sehr klein für leere
    const baseWidth = 15;
    const increment = 8.5;
    const calculatedWidth = baseWidth + (count - 1) * increment;
    return Math.min(calculatedWidth, 100); // Max 100%
  };

  return (
    <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-700 rounded-3xl p-6">
      {/* Header - kompakter */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Video-Status Übersicht</h2>
        <p className="text-xs text-neutral-500 mt-1">Klicke auf einen Status zum Filtern</p>
      </div>

      {/* Chart - minimalistisch */}
      <div className="space-y-2">
        {statusCounts.map((status, index) => {
          const StatusIcon = status.icon;
          const widthPercentage = calculateWidth(status.count);

          return (
            <motion.div
              key={status.status}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className="relative"
            >
              {/* Bar mit allem drin */}
              <button
                onClick={() => status.count > 0 && onStatusClick?.(status.status)}
                disabled={status.count === 0}
                className={`
                  relative h-12 rounded-xl overflow-hidden w-full
                  border ${status.borderColor}
                  ${status.bgColor} backdrop-blur-sm
                  ${status.count > 0 ? status.hoverColor : ''}
                  transition-all duration-300 ease-out
                  ${status.count > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  group
                  text-left
                `}
              >
                {/* Animated width bar - transparent mit leichtem Schimmer */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPercentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.08, ease: 'easeOut' }}
                  className={`
                    absolute inset-y-0 left-0
                    ${status.bgColor}
                    border-r ${status.borderColor}
                  `}
                >
                  {/* Schimmer-Effekt beim Hover */}
                  {status.count > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </motion.div>
                
                {/* Content - Icon, Label, Count */}
                <div className="relative z-10 h-full flex items-center justify-between px-4">
                  {/* Links: Icon + Label */}
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
                    <span className="text-sm font-medium text-neutral-200">
                      {status.label}
                    </span>
                  </div>
                  
                  {/* Rechts: Count */}
                  <span className={`text-sm font-bold ${status.textColor}`}>
                    {status.count}
                  </span>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Total - kompakter */}
      <div className="mt-4 pt-3 border-t border-neutral-700/50 flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-400">Gesamt</span>
        <span className="text-base font-bold text-white">{videos.length} Videos</span>
      </div>
    </div>
  );
}

