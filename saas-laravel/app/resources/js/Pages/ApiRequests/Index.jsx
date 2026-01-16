import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export default function ApiRequests() {
  const { apiRequests, filters = {} } = usePage().props
  const rows = apiRequests.data ?? []

  /* 🔍 Filters (synced with backend) */
  const { data, setData, get, processing } = useForm({
    subscription_id: filters.subscription_id || '',
    source: filters.source || '',
    from: filters.from || '',
    to: filters.to || '',
  })

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('api-requests.index'), {
      preserveScroll: true,
      preserveState: true,
    })
  }

  const resetFilters = () => {
    setData({
      subscription_id: '',
      source: '',
      from: '',
      to: '',
    })

    get(route('api-requests.index'), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  return (
    <AuthenticatedLayout>
      <Head title="API Requests" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">
          API Requests
        </h1>

        {/* 🔢 SUMMARY */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            Showing{' '}
            <span className="font-medium">{apiRequests.from ?? 0}</span>–
            <span className="font-medium">{apiRequests.to ?? 0}</span> of{' '}
            <span className="font-medium">{apiRequests.total}</span> requests
          </div>

          <div>
            Page{' '}
            <span className="font-medium">{apiRequests.current_page}</span> of{' '}
            <span className="font-medium">{apiRequests.last_page}</span>
          </div>
        </div>

        {/* 🔍 FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-5 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subscription ID
            </label>
            <input
              type="number"
              value={data.subscription_id}
              onChange={e => setData('subscription_id', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
              placeholder="123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source
            </label>
            <select
              value={data.source}
              onChange={e => setData('source', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            >
              <option value="">All</option>
              <option value="gateway">Gateway</option>
              <option value="webhook">Webhook</option>
              <option value="cron">Cron</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={data.from}
              onChange={e => setData('from', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              value={data.to}
              onChange={e => setData('to', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            />
          </div>

          <div className="flex gap-2">
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

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Event ID</th>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="12" className="px-4 py-6 text-center text-gray-500">
                    No API requests found
                  </td>
                </tr>
              )}

              {rows.map(req => (
                <tr key={req.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">
                    {req.event_id}
                  </td>

                  <td className="px-4 py-3 font-mono text-xs">
                    {req.order_id}
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
