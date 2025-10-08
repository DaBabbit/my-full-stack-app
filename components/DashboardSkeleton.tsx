/**
 * Skeleton Loading Component für Dashboard
 * @file components/DashboardSkeleton.tsx
 */

export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 bg-neutral-800 rounded w-48 mb-2"></div>
        <div className="h-5 bg-neutral-800 rounded w-64"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-neutral-800 rounded w-24 mb-2"></div>
                <div className="h-8 bg-neutral-800 rounded w-16"></div>
              </div>
              <div className="p-3 bg-neutral-800 rounded-lg">
                <div className="w-8 h-8 bg-neutral-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 mb-8">
        <div className="h-6 bg-neutral-800 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="h-14 bg-neutral-800 rounded-2xl"
            ></div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700">
        <div className="h-6 bg-neutral-800 rounded w-48 mb-4"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-700">
              <div className="flex items-center flex-1">
                <div className="w-10 h-10 bg-neutral-700 rounded-lg mr-4"></div>
                <div className="flex-1">
                  <div className="h-5 bg-neutral-700 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-neutral-700 rounded w-32"></div>
                </div>
              </div>
              <div className="h-4 bg-neutral-700 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

