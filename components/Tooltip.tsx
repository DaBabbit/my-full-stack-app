'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: string;
}

/**
 * Tooltip-Komponente mit Hover-Unterstützung
 * 
 * Features:
 * - Automatische Positionierung
 * - Konfigurierbare Verzögerung
 * - Responsive Design
 * - Smooth Animations
 * - Portal Rendering für z-index Probleme
 */
export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  delay = 200,
  maxWidth = '400px'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({ 
        top: rect.top + window.scrollY, 
        left: rect.left + window.scrollX 
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setShowTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (showTimeout) {
        clearTimeout(showTimeout);
      }
    };
  }, [showTimeout]);

  const getPositionStyles = () => {
    if (!triggerRef.current) return {};
    
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    switch (position) {
      case 'top':
        return {
          top: rect.top + scrollY - 8,
          left: rect.left + scrollX + rect.width / 2,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
        return {
          top: rect.bottom + scrollY + 8,
          left: rect.left + scrollX + rect.width / 2,
          transform: 'translate(-50%, 0)'
        };
      case 'left':
        return {
          top: rect.top + scrollY + rect.height / 2,
          left: rect.left + scrollX - 8,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return {
          top: rect.top + scrollY + rect.height / 2,
          left: rect.right + scrollX + 8,
          transform: 'translate(0, -50%)'
        };
      default:
        return {
          top: rect.top + scrollY - 8,
          left: rect.left + scrollX + rect.width / 2,
          transform: 'translate(-50%, -100%)'
        };
    }
  };

  const tooltipContent = isVisible && mounted ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[9999] pointer-events-none"
      style={{ ...getPositionStyles(), maxWidth }}
    >
      <div className="bg-neutral-800 text-white text-sm rounded-lg px-4 py-3 shadow-2xl border border-neutral-700">
        {typeof content === 'string' ? (
          <p className="text-neutral-200 leading-relaxed whitespace-normal">{content}</p>
        ) : (
          content
        )}
      </div>
      
      {/* Pfeil */}
      <div
        className={`absolute w-2 h-2 bg-neutral-800 border-neutral-700 transform rotate-45 ${
          position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r' :
          position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l' :
          position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r' :
          'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l'
        }`}
      />
    </motion.div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      
      {mounted && createPortal(
        <AnimatePresence>
          {tooltipContent}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

