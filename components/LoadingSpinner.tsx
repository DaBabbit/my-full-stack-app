/**
 * Loading spinner component for Suspense fallback
 * @file components/LoadingSpinner.tsx
 */

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
    </div>
  );
} 