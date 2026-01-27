import { useForm, Head, Link } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'

export default function ApiKeys({ keys, filters = {} }) {
  const rows = keys.data ?? []

  const { data, setData, get, processing } = useForm({
    hash: filters.hash || '',
    status: filters.status || '',
  })

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('api-keys.index'), { preserveScroll: true })
  }

  const resetFilters = () => {
    setData({ hash: '', status: '' })
    get(route('api-keys.index'), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  return (
    <AuthenticatedLayout>
      <Head title="API Keys" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">API Keys</h1>

        {/* FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-4 items-end"
        >
          <input
            type="text"
            placeholder="Key hash"
            value={data.hash}
            onChange={(e) => setData('hash', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <select
            value={data.status}
            onChange={(e) => setData('status', e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Expired</option>
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
            Showing <span className="font-medium">{keys.from ?? 0}</span>–
            <span className="font-medium">{keys.to ?? 0}</span> of{' '}
            <span className="font-medium">{keys.total}</span> keys
          </div>

          <div>
            Page <span className="font-medium">{keys.current_page}</span> of{' '}
            <span className="font-medium">{keys.last_page}</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Key Hash</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="2" className="px-4 py-6 text-center text-gray-500">
                    No API keys found.
                  </td>
                </tr>
              ) : (
                rows.map((key) => (
                  <tr key={key.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      {key.hash}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-medium
                          ${
                            key.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {key.status === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {keys.links?.length > 1 && (
          <div className="flex justify-center gap-1 flex-wrap">
            {keys.links.map((link, index) => (
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
