import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, usePage } from '@inertiajs/react'

export default function ApiRequests() {
  const { apiRequests } = usePage().props
  const rows = apiRequests.data ?? []

  return (
    <AuthenticatedLayout>
      <Head title="API Requests" />

      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">
          API Requests
        </h1>

        {/* SUMMARY */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-medium">{apiRequests.from ?? 0}</span>–
            <span className="font-medium">{apiRequests.to ?? 0}</span> of{' '}
            <span className="font-medium">{apiRequests.total}</span> requests
          </div>

          <div className="text-sm text-gray-600">
            Page{' '}
            <span className="font-medium">
              {apiRequests.current_page}
            </span>{' '}
            of{' '}
            <span className="font-medium">
              {apiRequests.last_page}
            </span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Event ID</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No API requests yet
                  </td>
                </tr>
              )}

              {rows.map(req => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {req.event_id}
                  </td>

                  <td className="px-4 py-3">
                    #{req.subscription_id}
                  </td>

                  <td className="px-4 py-3">
                    {req.amount}
                  </td>

                  <td className="px-4 py-3">
                    {req.source}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {new Date(req.ts).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {apiRequests.links?.length > 1 && (
          <>
            <div className="mt-6 flex justify-center gap-1 flex-wrap">
              {apiRequests.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.url ?? '#'}
                  preserveScroll
                  className={`px-3 py-1 text-sm rounded border
                    ${
                      link.active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }
                    ${!link.url && 'opacity-50 cursor-not-allowed'}
                  `}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              ))}
            </div>

            <p className="mt-3 text-sm text-gray-600 text-center">
              Page {apiRequests.current_page} of {apiRequests.last_page}
            </p>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
