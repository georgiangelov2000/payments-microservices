import { useForm, Head, Link, usePage, router } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Plus, SlidersHorizontal, RotateCcw, Key } from 'lucide-react'

export default function ApiKeys({ keys, filters = {} }) {
  const { flash } = usePage().props
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
    router.get(route('api-keys.index'), {}, {
      preserveScroll: true,
      preserveState: false,
    })
  }

  const generateKey = () => {
    router.post(route('api-keys.store'), {}, {
      preserveScroll: true,
    })
  }

  return (
    <AuthenticatedLayout>
      <Head title="API Keys" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <button
            type="button"
            onClick={generateKey}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={15} strokeWidth={2.5} />
            Generate API Key
          </button>
        </div>

        {flash?.generated_api_key && (
          <div className="rounded border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <div className="font-medium">New API key</div>
            <div className="mt-2 break-all font-mono text-xs">
              {flash.generated_api_key}
            </div>
          </div>
        )}

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
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <SlidersHorizontal size={14} strokeWidth={2} />
              Filter
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw size={14} strokeWidth={2} />
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
                <th className="px-4 py-3 text-left">Environment</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Key size={32} strokeWidth={1.25} />
                      <span className="text-sm font-medium">No API keys found</span>
                    </div>
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
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold capitalize
                          ${
                            key.environment === 'live'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                      >
                        {key.environment === 'live' ? 'Live' : 'Test'}
                      </span>
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
