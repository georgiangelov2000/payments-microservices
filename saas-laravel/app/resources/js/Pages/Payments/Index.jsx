import { useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import React from 'react'

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const { csrf_token } = usePage().props
  const csrfToken =
    csrf_token || document.querySelector('meta[name="csrf-token"]')?.content || ''

  const [openLogs, setOpenLogs] = useState(null)
  const [logs, setLogs] = useState({})
  const [logsLoading, setLogsLoading] = useState({})

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

    router.get(route('payments.index'), {}, {
      preserveScroll: true,
      replace: true,
    })
  }

  const exportPayments = async (format) => {
    const toastId = toast.loading('Preparing export…')

    try {
      const response = await fetch(route('payments.export'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json, application/octet-stream',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          order_id: data.order_id,
          status: data.status,
          from: data.from,
          to: data.to,
          format,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const result = await response.json()
          throw new Error(result.message || 'Export failed')
        }

        throw new Error(`Export failed with HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] || `payments.${format}`
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(`Exported ${filename}`, { id: toastId })
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

    setLogsLoading(prev => ({ ...prev, [paymentId]: true }))

    try {
      const response = await fetch(
        `/api/v1/payment-logs/payments/${paymentId}/logs`,
        {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        }
      )

      const result = await response.json()

      setLogs(prev => ({
        ...prev,
        [paymentId]: result.results ?? [],
      }))
    } finally {
      setLogsLoading(prev => ({ ...prev, [paymentId]: false }))
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
          <input
            type="text"
            placeholder="Order ID"
            value={data.order_id}
            onChange={e => setData('order_id', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <select
            value={data.status}
            onChange={e => setData('status', e.target.value)}
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
            onChange={e => setData('from', e.target.value)}
            className="rounded border-gray-300 text-sm"
          />

          <input
            type="date"
            value={data.to}
            onChange={e => setData('to', e.target.value)}
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
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                rows.map(payment => (
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
                        <td colSpan={7} className="px-6 py-4">
                          <div className="border-l-4 border-indigo-500 pl-4">
                            {logsLoading[payment.id] ? (
                              <p className="text-sm text-gray-500">
                                Loading logs…
                              </p>
                            ) : logs[payment.id]?.length ? (
                              <table className="w-full text-xs border border-gray-200 rounded">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Event</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-left">Message</th>
                                    <th className="px-3 py-2 text-right">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {logs[payment.id].map(log => (
                                    <tr key={log.id} className="border-t">
                                      <td className="px-3 py-2 font-medium">
                                        {log.event_type_label}
                                      </td>
                                      <td className="px-3 py-2">
                                        {log.status_label}
                                      </td>
                                      <td className="px-3 py-2 text-gray-700">
                                        {log.message ?? '—'}
                                      </td>
                                      <td className="px-3 py-2 text-right text-gray-500">
                                        {new Date(log.created_at).toLocaleString('sv-SE')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No logs for this payment
                              </p>
                            )}
                          </div>
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
            {payments.links.map(link => (
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
