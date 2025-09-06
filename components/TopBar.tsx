'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// Removed unused imports: useSubscription, useTrialStatus, BuyMeCoffee
// import { supabase } from '@/utils/supabase';

// TopBar component handles user profile display and navigation
export default function TopBar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Removed subscription-related state

  // State for tracking logout process
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // State for scroll effect
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for transparent background
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle user logout with error handling and loading state
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      setIsDropdownOpen(false);
      setIsLoggingOut(false);
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-black/80 backdrop-blur-md border-b border-white/10' 
        : 'bg-black border-b border-neutral-800'
    }`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-white flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image 
            src="/kosmamedia-logo.svg" 
            alt="KosmaMedia Logo" 
            width={40} 
            height={32} 
            className="h-8 w-auto filter invert"
          />
          <span className="font-sans hidden sm:block">KosmaMedia</span>
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              {/* Show login button for unauthenticated users */}
              <Link
                href="/login"
                className="px-6 py-2 text-sm font-medium text-black bg-white hover:bg-neutral-100 rounded-lg transition-all duration-200 shadow-soft hover:shadow-medium"
              >
                Sign in
              </Link>
            </>
          ) : (
            // Show profile for authenticated users
            <>

              {/* Content-Planer Button - Immer sichtbar für eingeloggte User */}
              {user && pathname !== '/dashboard' && (
                <button
                  onClick={() => router.push('/dashboard')}
                  className="hidden sm:block px-4 py-2 bg-white hover:bg-neutral-100 text-black rounded-lg text-sm font-medium transition-all duration-200 shadow-soft hover:shadow-medium"
                >
                  🎬 Content-Planer
                </button>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-medium">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  {/* Dropdown Arrow */}
                  <svg 
                    className={`w-4 h-4 text-white transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-large py-1 z-[60] border border-neutral-200">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-black hover:bg-neutral-50 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsDropdownOpen(false);
                        window.location.href = '/profile';
                      }}
                    >
                      Profile & Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                    >
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 