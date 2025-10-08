/**
 * Skeleton Loading Component für Video-Tabelle
 * @file components/VideoTableSkeleton.tsx
 */

export default function VideoTableSkeleton() {
  return (
    <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden animate-pulse">
      <div className="px-6 py-4 border-b border-neutral-700">
        <div className="h-6 bg-neutral-800 rounded w-32"></div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-16"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-28"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-20"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-20"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
              </th>
              <th className="text-left py-3 px-4">
                <div className="h-4 bg-neutral-800 rounded w-16"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index} className="border-b border-neutral-800">
                <td className="py-4 px-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-neutral-800 rounded-lg mr-3"></div>
                    <div className="h-5 bg-neutral-800 rounded w-32"></div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-8 bg-neutral-800 rounded-xl w-full"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-20"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-24"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-16"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-20"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-16"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="h-4 bg-neutral-800 rounded w-32"></div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-neutral-800 rounded"></div>
                    <div className="w-8 h-8 bg-neutral-800 rounded"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 p-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center flex-1">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg mr-3"></div>
                <div className="h-5 bg-neutral-800 rounded w-32"></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-neutral-800 rounded"></div>
                <div className="w-8 h-8 bg-neutral-800 rounded"></div>
              </div>
            </div>
            <div className="h-8 bg-neutral-800 rounded-xl w-full"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-12 bg-neutral-800 rounded"></div>
              <div className="h-12 bg-neutral-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

