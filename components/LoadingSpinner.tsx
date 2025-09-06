/**
 * Loading spinner component for Suspense fallback
 * @file components/LoadingSpinner.tsx
 */

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <span className="loading loading-ring loading-lg text-white"></span>
    </div>
  );
} 