import { useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage } from '@inertiajs/react'

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const { csrf_token } = usePage().props

  /* logs state */
  const [openLogs, setOpenLogs] = useState(null)
  const [logs, setLogs] = useState({})
  const [logsLoading, setLogsLoading] = useState(false)

  /* filters */
  const { data, setData, get, processing } = useForm({
    order_id: filters.order_id || '',
    status: filters.status || '',
    from: filters.from || '',
    to: filters.to || '',
  })

  const submitFilters = (e) => {
    e.preventDefault()
    get(route('payments.index'), { preserveScroll: true })
  }

  const resetFilters = () => {
    setData({ order_id: '', status: '', from: '', to: '' })
    get(route('payments.index'), {
      preserveScroll: true,
      preserveState: false,
    })
  }

  /* export */
  const exportPayments = async (format) => {
    await fetch(route('payments.export'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf_token,
      },
      body: JSON.stringify({
        from: data.from,
        to: data.to,
        format,
      }),
    })
  }

  /* load logs lazily */
  const toggleLogs = async (paymentId) => {
    if (openLogs === paymentId) {
      setOpenLogs(null)
      return
    }

    setOpenLogs(paymentId)

    if (logs[paymentId]) return

    setLogsLoading(true)

    try {
      const response = await fetch(`/api/v1/payments/${paymentId}/logs`, {
        headers: { Accept: 'application/json' },
      })

      const result = await response.json()

      setLogs(prev => ({
        ...prev,
        [paymentId]: result,
      }))
    } finally {
      setLogsLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <Head title="Payments" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Payments</h1>

        {/* EXPORT */}
        <div className="flex gap-2">
          {['csv', 'xlsx', 'json'].map(f => (
            <button
              key={f}
              onClick={() => exportPayments(f)}
              className="rounded bg-indigo-600 text-white px-4 py-2 text-sm hover:bg-indigo-700"
            >
              Export {f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* FILTERS */}
        <form
          onSubmit={submitFilters}
          className="bg-white rounded-lg border p-4 grid gap-4 md:grid-cols-5 items-end"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Order ID
            </label>
            <input
              type="text"
              value={data.order_id}
              onChange={(e) => setData('order_id', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
              placeholder="ORD-12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={data.status}
              onChange={(e) => setData('status', e.target.value)}
              className="mt-1 w-full rounded border-gray-300 text-sm"
            >
              <option value="">All</option>
              <option value="finished">Finished</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={data.from}
              onChange={(e) => setData('from', e.target.value)}
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
              onChange={(e) => setData('to', e.target.value)}
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
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Logs</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    No payments found
                  </td>
                </tr>
              )}

              {rows.map(payment => (
                <>
                  <tr key={payment.id} className="border-b">
                    <td className="px-4 py-3">{payment.id}</td>
                    <td className="px-4 py-3 font-medium">{payment.order_id}</td>
                    <td className="px-4 py-3">${payment.price}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium
                          ${
                            payment.status === 'finished'
                              ? 'bg-green-100 text-green-700'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(payment.created_at).toLocaleString('sv-SE')}
                    </td>
                    <td className="px-4 py-3">{payment.provider}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleLogs(payment.id)}
                        className="text-indigo-600 text-xs hover:underline"
                      >
                        {openLogs === payment.id ? 'Hide logs' : 'View logs'}
                      </button>
                    </td>
                  </tr>

                  {openLogs === payment.id && (
                    <tr className="bg-gray-50">
                      <td colSpan="7" className="px-6 py-4">
                        {logsLoading ? (
                          <p className="text-sm text-gray-500">Loading logs…</p>
                        ) : logs[payment.id]?.length ? (
                          <div className="space-y-3">
                            {logs[payment.id].map(log => (
                              <div
                                key={log.id}
                                className={`border-l-4 pl-3 flex justify-between
                                  ${
                                    log.status === 'success'
                                      ? 'border-green-500'
                                      : 'border-red-500'
                                  }`}
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {log.event_type_label}
                                  </p>
                                  {log.message && (
                                    <p className="text-xs text-gray-600">
                                      {log.message}
                                    </p>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(log.created_at).toLocaleString('sv-SE')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No logs for this payment
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {payments.links?.length > 1 && (
          <div className="flex justify-center gap-1 flex-wrap mt-4">
            {payments.links.map((link, i) => (
              <Link
                key={i}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 text-sm rounded border
                  ${
                    link.active
                      ? 'bg-indigo-600 text-white'
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
