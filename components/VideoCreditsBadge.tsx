'use client';

import { Film } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoCreditsBadgeProps {
  currentCredits: number;
  monthlyLimit: number;
  isLoading?: boolean;
}

export function VideoCreditsBadge({ 
  currentCredits, 
  monthlyLimit, 
  isLoading = false 
}: VideoCreditsBadgeProps) {
  // Berechne Prozentsatz für Farbe
  const percentage = (currentCredits / monthlyLimit) * 100;
  
  // Farblogik: Grün -> Gelb -> Orange -> Rot
  const getStatusColor = () => {
    if (percentage < 50) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (percentage < 75) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    if (percentage < 90) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getIconColor = () => {
    if (percentage < 50) return 'text-green-400';
    if (percentage < 75) return 'text-yellow-400';
    if (percentage < 90) return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/50 border border-neutral-700 backdrop-blur-md">
        <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 hidden md:inline">Lädt...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-300 ${getStatusColor()}`}
      title={`${currentCredits} von ${monthlyLimit} Videocredits diesen Monat verwendet`}
    >
      {/* Icon */}
      <Film className={`w-4 h-4 ${getIconColor()}`} />
      
      {/* Text - Desktop: volle Beschreibung, Mobil: nur Zahlen */}
      <div className="flex items-center gap-1">
        <span className="hidden lg:inline text-xs font-medium">Videocredits:</span>
        <span className="text-xs font-bold">
          {currentCredits} / {monthlyLimit}
        </span>
      </div>
    </motion.div>
  );
}

