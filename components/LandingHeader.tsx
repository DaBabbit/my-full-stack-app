'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LandingHeader() {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isScrolled
          ? 'bg-black/90 backdrop-blur-md border-b border-neutral-800'
          : 'bg-black/50 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-white font-semibold text-xl tracking-tight hover:text-neutral-200 transition-colors"
          >
            kosmamedia
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('preise')}
              className="text-neutral-400 hover:text-white transition-colors text-sm font-medium"
            >
              Preise
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2.5 bg-white text-black rounded-full font-medium text-sm hover:bg-neutral-100 transition-colors"
            >
              Login
            </button>
          </nav>

          {/* Mobile - Only Login */}
          <div className="md:hidden">
            <button
              onClick={() => router.push('/login')}
              className="px-5 py-2 bg-white text-black rounded-full font-medium text-sm"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

