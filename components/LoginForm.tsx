'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LoginFormProps {
  onSubmit: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
  error?: string;
  defaultToSignUp?: boolean;
  hideToggle?: boolean;
}

export function LoginForm({ 
  onSubmit, 
  onGoogleSignIn, 
  isLoading, 
  error,
  defaultToSignUp = false,
  hideToggle = false
}: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(defaultToSignUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, isSignUp);
  };

  return (
    <div className="w-full space-y-8 p-8 bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image 
            src="/kosmamedia-logo.svg" 
            alt="KosmaMedia Logo" 
            width={40} 
            height={32} 
            className="h-8 w-auto filter invert"
          />
          <h2 className="text-2xl font-semibold text-white">
            kosmamedia
          </h2>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl backdrop-blur-sm text-center">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <button
          onClick={onGoogleSignIn}
          className="w-full py-3 px-4 border border-neutral-600 rounded-xl bg-neutral-800/50 text-white hover:bg-neutral-700/50 hover:border-neutral-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-center font-medium backdrop-blur-sm"
        >
          <Image
            src="/Google-Logo.png"
            alt="Google Logo"
            width={20}
            height={20}
            className="mr-3"
          />
          Mit Google anmelden
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-neutral-600"></div>
          <span className="mx-4 text-sm text-neutral-400 font-medium">ODER</span>
          <div className="flex-grow border-t border-neutral-600"></div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">
          {isSignUp ? 'Konto erstellen' : 'Willkommen zurück'}
        </h2>
        <p className="mt-2 text-sm text-neutral-300">
          {isSignUp ? 'Geben Sie Ihre Daten ein, um zu beginnen' : 'Geben Sie Ihre E-Mail ein, um zu beginnen.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-700 hover:border-neutral-600 transition-all duration-300"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
            className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-700 hover:border-neutral-600 transition-all duration-300"
          />
        </div>

        <div className="flex items-center justify-between">
          <a
            href="/reset-password"
            className="text-sm text-neutral-400 hover:text-white transition-colors font-medium"
          >
            Passwort vergessen?
          </a>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="group w-full py-3 px-4 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-xl font-medium transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-800 disabled:hover:text-white disabled:hover:border-neutral-700"
        >
          <span className="flex items-center justify-center gap-2">
            {isSignUp ? 'Registrieren' : 'Los geht\'s'}
            {!isSignUp && (
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </span>
        </button>

        {!hideToggle && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-neutral-400 hover:text-white transition-colors font-medium"
          >
            {isSignUp ? 'Bereits ein Konto? Anmelden' : 'Noch kein Konto? Registrieren'}
          </button>
        </div>
        )}
      </form>
    </div>
  );
}