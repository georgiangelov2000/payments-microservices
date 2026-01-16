import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, usePage } from '@inertiajs/react'

export default function Subscriptions() {
  const { subscriptions } = usePage().props
  const rows = subscriptions.data ?? []

  return (
    <AuthenticatedLayout>
      <Head title="Subscriptions" />

      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">
          Subscriptions
        </h1>

        {/* 🔢 SUMMARY */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            Showing{' '}
            <span className="font-medium">{subscriptions.from ?? 0}</span>–
            <span className="font-medium">{subscriptions.to ?? 0}</span> of{' '}
            <span className="font-medium">{subscriptions.total}</span> subscriptions
          </div>

          <div>
            Page{' '}
            <span className="font-medium">{subscriptions.current_page}</span> of{' '}
            <span className="font-medium">{subscriptions.last_page}</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Usage</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Price</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No subscriptions yet
                  </td>
                </tr>
              )}

              {rows.map(sub => (
                <tr key={sub.id} className="border-b last:border-0">
                  {/* Plan */}
                  <td className="px-4 py-3 font-medium">
                    {sub.name}
                  </td>

                  {/* Usage */}
                  <td className="px-4 py-3">
                    {sub.used_tokens} / {sub.tokens}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium
                        ${
                          sub.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {sub.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    {sub.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {subscriptions.links?.length > 1 && (
          <>
            <div className="mt-6 flex justify-center gap-1 flex-wrap">
              {subscriptions.links.map((link, index) => (
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
              Page {subscriptions.current_page} of {subscriptions.last_page}
            </p>
          </>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
