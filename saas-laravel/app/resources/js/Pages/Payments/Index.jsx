import { useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import toast from 'react-hot-toast'
import React from 'react'

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const { csrf_token } = usePage().props

  const [openLogs, setOpenLogs] = useState(null)
  const [logs, setLogs] = useState({})
  const [logsLoading, setLogsLoading] = useState(false)

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

  const exportPayments = async (format) => {
    const toastId = toast.loading('Starting export…')

    try {
      const response = await fetch(route('payments.export'), {
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Export failed')
      }

      toast.success(result.message, { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Export failed', { id: toastId })
    }
  }


  const toggleLogs = async (paymentId) => {
    if (openLogs === paymentId) {
      setOpenLogs(null)
      return
    }

    setOpenLogs(paymentId)

    if (logs[paymentId]) return

    setLogsLoading(true)

    try {
      const response = await fetch(
        `/api/v1/payment-logs/payments/${paymentId}/logs`,
        {
          headers: {
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        }
      )


      const result = await response.json()

      setLogs((prev) => ({
        ...prev,
        [paymentId]: result.results ?? [],
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
          {['csv', 'xlsx', 'json'].map((f) => (
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
          <input
            type="text"
            placeholder="Order ID"
            value={data.order_id}
            onChange={(e) => setData('order_id', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <select
            value={data.status}
            onChange={(e) => setData('status', e.target.value)}
            className="rounded border-gray-300 text-sm"
          >
            <option value="">All</option>
            <option value="finished">Finished</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="date"
            value={data.from}
            onChange={(e) => setData('from', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <input
            type="date"
            value={data.to}
            onChange={(e) => setData('to', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

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
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-sm text-gray-500"
                  >
                    No payments found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((payment) => (
                  <React.Fragment key={payment.id}>
                    <tr className="border-b">
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
                            /* logs table (unchanged) */
                            <div>…</div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No logs for this payment
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* PAGINATION */}
        {payments.links?.length > 1 && (
          <div className="flex justify-center gap-1 flex-wrap mt-4">
            {payments.links.map((link) => (
              <Link
                key={link.label}
                href={link.url ?? '#'}
                preserveScroll
                className={`px-3 py-1 text-sm rounded border ${
                  link.active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white hover:bg-gray-100'
                } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
