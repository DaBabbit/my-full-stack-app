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
    <div className="w-full bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-black flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image 
            src="/kosmamedia-logo.svg" 
            alt="KosmaMedia Logo" 
            width={40} 
            height={32} 
            className="h-8 w-auto"
          />
          <span className="font-sans hidden sm:block">KosmaMedia</span>
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <>
              {/* Show login button for unauthenticated users */}
              <Link
                href="/login"
                className="px-6 py-2 text-sm font-medium text-white bg-black hover:bg-neutral-900 rounded-lg transition-all duration-200 shadow-soft hover:shadow-glow-hover"
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
                  className="hidden sm:block px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-soft hover:shadow-medium"
                >
                  🎬 Content-Planer
                </button>
              )}
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 hover:bg-neutral-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-black font-medium">
                    {user.email?.[0].toUpperCase()}
                  </div>
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