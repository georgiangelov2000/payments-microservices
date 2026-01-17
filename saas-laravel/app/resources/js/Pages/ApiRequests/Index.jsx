import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export default function ApiRequests() {
  const { apiRequests, filters = {} } = usePage().props
  const rows = apiRequests.data ?? []

  /* 🔍 Filters (synced with backend) */
  const { data, setData, get, processing } = useForm({
    plan: filters.plan || '',
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
      plan  : '',
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

        {/* UMMARY */}
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

        {/* FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-5 items-end"
        >

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source
            </label>
            <select
              value={data.source}
              onChange={e => setData('plan', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            >
            <option value="">All</option>
            <option value="basic_plan">Basic Plan</option>
            <option value="premium_plan">Premium Plan</option>
            <option value="enterprise_plan">Enterprise Plan</option>
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
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left">Subscription</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                    No API requests found
                  </td>
                </tr>
              )}

              {rows.map(req => (
                <tr key={req.id} className="border-b last:border-0">
                  {/* Event */}
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {req.event_id}
                  </td>

                  {/* Subscription */}
                  <td className="px-4 py-3">
                    {req.subscription_name}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      #{req.payment_id ? `${req.payment_id}` : '—'}
                    </span>
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(req.created_at).toLocaleString()}
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
