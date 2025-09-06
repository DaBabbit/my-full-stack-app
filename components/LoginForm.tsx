'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LoginFormProps {
  onSubmit: (email: string, password: string, isSignUp: boolean) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export function LoginForm({ 
  onSubmit, 
  onGoogleSignIn, 
  isLoading, 
  error 
}: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password, isSignUp);
  };

  return (
    <div className="w-full space-y-8 p-8 bg-white rounded-2xl shadow-large border border-neutral-200">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Image 
            src="/kosmamedia-logo.svg" 
            alt="KosmaMedia Logo" 
            width={40} 
            height={32} 
            className="h-8 w-auto"
          />
          <h2 className="text-2xl font-semibold text-black">
            KosmaMedia
          </h2>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-center">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        <button
          onClick={onGoogleSignIn}
          className="w-full py-3 px-4 border border-neutral-200 rounded-lg shadow-soft text-black bg-white hover:bg-neutral-50 hover:shadow-medium transition-all duration-200 flex items-center justify-center font-medium"
        >
          <Image
            src="/Google-Logo.png"
            alt="Google Logo"
            width={20}
            height={20}
            className="mr-3"
          />
          Sign in with Google
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-neutral-200"></div>
          <span className="mx-4 text-sm text-neutral-500 font-medium">OR</span>
          <div className="flex-grow border-t border-neutral-200"></div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-black">
          {isSignUp ? 'Create an account' : 'Welcome'}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {isSignUp ? 'Fill in your details to get started' : 'Enter your email to get started.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg placeholder-neutral-500 text-black bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg placeholder-neutral-500 text-black bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-200"
            style={{ color: '#000000' }}
          />
        </div>

        <div className="flex items-center justify-between">
          <a
            href="/reset-password"
            className="text-sm text-accent hover:text-accent-dark transition-colors font-medium"
          >
            Forgot your password?
          </a>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="group w-full py-3 px-4 bg-black text-white rounded-lg font-medium
                   shadow-soft hover:shadow-glow-hover hover:bg-neutral-900
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
                   transition-all duration-300 ease-out"
        >
          <span className="flex items-center justify-center gap-2">
            {isSignUp ? 'Sign up' : 'Let´s go'}
            {!isSignUp && (
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </span>
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-accent hover:text-accent-dark transition-colors font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </form>
    </div>
  );
}