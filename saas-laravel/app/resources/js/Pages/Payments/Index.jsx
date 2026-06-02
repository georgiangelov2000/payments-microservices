import { useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link, useForm, usePage, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import React from 'react'

const formatDateTime = (value) => {
  if (!value) return 'Not available'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('sv-SE')
}

const formatNumber = (value, decimals = 2) => {
  const number = Number(value)

  return Number.isFinite(number) ? number.toFixed(decimals) : '0.00'
}

const statusClass = (status, timingState) => {
  if (timingState === 'delayed') return 'bg-orange-100 text-orange-700'
  if (status === 'finished') return 'bg-green-100 text-green-700'
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const { csrf_token } = usePage().props
  const csrfToken =
    csrf_token || document.querySelector('meta[name="csrf-token"]')?.content || ''

  const [openWorkflow, setOpenWorkflow] = useState(null)

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

  const toggleWorkflow = (paymentId) => {
    setOpenWorkflow(openWorkflow === paymentId ? null : paymentId)
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
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Timing</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                rows.map(payment => (
                  <React.Fragment key={payment.id}>
                    <tr className="border-b">
                      <td className="px-4 py-3">{payment.id}</td>
                      <td className="px-4 py-3 font-medium">{payment.order_id}</td>
                      <td className="px-4 py-3">${formatNumber(payment.price)}</td>
                      <td className="px-4 py-3">{formatNumber(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${statusClass(payment.status, payment.timing?.state)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(payment.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>
                            <span className="font-medium text-gray-700">Duration:</span>{' '}
                            {payment.timing?.processing_duration ?? 'Not available'}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Last update:</span>{' '}
                            {formatDateTime(payment.timing?.last_provider_update_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {payment.provider}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleWorkflow(payment.id)}
                          className="text-indigo-600 text-xs hover:underline"
                        >
                          {openWorkflow === payment.id ? 'Hide Provider Workflow' : 'View Provider Workflow'}
                        </button>
                      </td>
                    </tr>

                    {openWorkflow === payment.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="border-l-4 border-indigo-500 pl-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">Payment Timeline</h3>
                                <p className="text-xs text-gray-500">
                                  Provider workflow events are shown chronologically.
                                </p>
                              </div>
                            </div>

                            {payment.workflow_timeline?.length ? (
                              <ol className="mt-4 space-y-3">
                                {payment.workflow_timeline.map((event, index) => (
                                  <li key={`${payment.id}-${index}`} className="grid gap-3 border-l-2 border-indigo-200 pl-4 md:grid-cols-[230px_1fr]">
                                    <time className="font-mono text-xs text-gray-500">
                                      {formatDateTime(event.timestamp)}
                                    </time>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {event.message || 'Provider response received without a readable summary'}
                                      </div>
                                      <div className="mt-1 text-xs text-gray-500">
                                        {event.event_type} · {event.status}
                                      </div>
                                      {event.technical_response && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs text-indigo-600">
                                            View Technical Details
                                          </summary>
                                          <pre className="mt-2 max-h-56 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-100">
                                            {JSON.stringify(event.technical_response, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="mt-4 text-sm text-gray-500">
                                No provider workflow events are available yet.
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
