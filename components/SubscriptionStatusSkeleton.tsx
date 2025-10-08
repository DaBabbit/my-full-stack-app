/**
 * Skeleton Loading Component für Subscription Status/Warning
 * @file components/SubscriptionStatusSkeleton.tsx
 */

export default function SubscriptionStatusSkeleton() {
  return (
    <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-2xl p-4 md:p-6 backdrop-blur-sm animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-neutral-700 rounded-xl"></div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="h-6 bg-neutral-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-neutral-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-4"></div>
          
          <div className="h-10 bg-neutral-700 rounded-xl w-40"></div>
        </div>
      </div>
    </div>
  );
}

