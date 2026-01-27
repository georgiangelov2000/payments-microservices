import { useForm, Head, Link, usePage } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { router } from '@inertiajs/react'

export default function Subscriptions({ filters = {} }) {
  const { subscriptions } = usePage().props
  const rows = subscriptions.data ?? []

  const { data, setData, get, processing } = useForm({
    plan: filters.plan || '',
    status: filters.status || '',
  })

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('subscriptions.index'), { preserveScroll: true })
  }

  const resetFilters = () => {
    setData({ plan: '', status: '' })
    router.get(route('subscriptions.index'), {}, {
      preserveScroll: true,
      replace: true,
    })    
  }

  return (
    <AuthenticatedLayout>
      <Head title="Subscriptions" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Subscriptions</h1>

        {/* FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-4 items-end"
        >
          <input
            type="text"
            placeholder="Plan name"
            value={data.plan}
            onChange={(e) => setData('plan', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <select
            value={data.status}
            onChange={(e) => setData('status', e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={processing}
              className="w-full rounded bg-indigo-600 text-white py-2 text-sm hover:bg-indigo-700"
            >
              Filter
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded border py-2 text-sm hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </form>

        {/* SUMMARY */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            Showing <span className="font-medium">{subscriptions.from ?? 0}</span>–
            <span className="font-medium">{subscriptions.to ?? 0}</span> of{' '}
            <span className="font-medium">{subscriptions.total}</span> subscriptions
          </div>

          <div>
            Page <span className="font-medium">{subscriptions.current_page}</span> of{' '}
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
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                rows.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{sub.name}</td>

                    <td className="px-4 py-3">
                      {sub.used_tokens} / {sub.tokens}
                    </td>

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

                    <td className="px-4 py-3">{sub.price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {subscriptions.links?.length > 1 && (
          <div className="flex justify-center gap-1 flex-wrap">
            {subscriptions.links.map((link, index) => (
              <Link
                key={index}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 text-sm rounded border
                  ${
                    link.active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white hover:bg-gray-100'
                  }
                  ${!link.url && 'opacity-50 cursor-not-allowed'}
                `}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
