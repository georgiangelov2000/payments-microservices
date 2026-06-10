import { useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import ProviderBrand from '@/Components/ProviderBrand'
import { Head, Link, useForm, usePage, router } from '@inertiajs/react'
import toast from 'react-hot-toast'
import React from 'react'
import { Download, SlidersHorizontal, RotateCcw, ChevronDown, ChevronUp, CreditCard, Info, Copy, Check } from 'lucide-react'
import { fmtDate } from '@/utils'

const formatDateTime = (value) => fmtDate(value) === '—' ? 'Not available' : fmtDate(value)

const formatNumber = (value, decimals = 2) => {
  const number = Number(value)

  return Number.isFinite(number) ? number.toFixed(decimals) : '0.00'
}

const STATUS_META = {
  pending:            { color: 'bg-yellow-100 text-yellow-700',  label: 'Pending',            desc: 'Created — awaiting customer checkout' },
  processing:         { color: 'bg-blue-100 text-blue-700',      label: 'Processing',         desc: 'Customer submitted — awaiting provider confirmation' },
  finished:           { color: 'bg-green-100 text-green-700',    label: 'Finished',           desc: 'Captured successfully' },
  failed:             { color: 'bg-red-100 text-red-700',        label: 'Failed',             desc: 'Declined by provider or all providers failed' },
  cancelled:          { color: 'bg-slate-100 text-slate-600',    label: 'Cancelled',          desc: 'Cancelled before capture' },
  refunded:           { color: 'bg-indigo-100 text-indigo-700',  label: 'Refunded',           desc: 'Full refund issued' },
  partially_refunded: { color: 'bg-indigo-100 text-indigo-600',  label: 'Partial refund',     desc: 'Partial refund issued' },
  disputed:           { color: 'bg-orange-100 text-orange-700',  label: 'Disputed',           desc: 'Chargeback or dispute open' },
  expired:            { color: 'bg-gray-100 text-gray-500',      label: 'Expired',            desc: 'Session expired without action' },
}

const statusClass = (status, timingState) => {
  if (timingState === 'delayed') return 'bg-orange-100 text-orange-700'
  return STATUS_META[status]?.color ?? 'bg-red-100 text-red-700'
}

export default function Payments({ payments, filters = {} }) {
  const rows = payments.data ?? []
  const { csrf_token } = usePage().props
  const csrfToken =
    csrf_token || document.querySelector('meta[name="csrf-token"]')?.content || ''

  const [openWorkflow, setOpenWorkflow] = useState(null)
  const [showLegend, setShowLegend] = useState(false)

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
    const toastId = toast.loading(`Queuing ${format.toUpperCase()} export…`)

    try {
      const response = await fetch(route('payments.export'), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
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

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || `Export failed (HTTP ${response.status})`)
      }

      toast.success(result.message, { id: toastId, duration: 7000 })
    } catch (err) {
      toast.error(err.message || 'Export failed', { id: toastId })
    }
  }

  const [copiedId, setCopiedId] = useState(null)

  const copyUuid = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  const toggleWorkflow = (paymentId) => {
    setOpenWorkflow(openWorkflow === paymentId ? null : paymentId)
  }

  return (
    <AuthenticatedLayout>
      <Head title="Payments" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Payments</h1>
          <button
            type="button"
            onClick={() => setShowLegend(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Info size={13} strokeWidth={2} />
            Status guide
            {showLegend ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
          </button>
        </div>

        {/* STATUS LEGEND */}
        {showLegend && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment statuses</p>
            <div className="flex flex-col gap-2">
              {Object.entries(STATUS_META).map(([key, { color, label, desc }]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-32 shrink-0 rounded px-2 py-0.5 text-center text-[10px] font-semibold ${color}`}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPORT */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1">Export &amp; email:</span>
          {['csv', 'xlsx', 'json'].map(f => (
            <button
              key={f}
              onClick={() => exportPayments(f)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Download size={14} strokeWidth={2} />
              {f.toUpperCase()}
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
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
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

        {/* TABLE */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Timing</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <CreditCard size={32} strokeWidth={1.25} />
                      <span className="text-sm font-medium">No payments found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(payment => (
                  <React.Fragment key={payment.id}>
                    <tr className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          title={payment.id}
                          onClick={() => copyUuid(payment.id)}
                          className="inline-flex items-center gap-1 font-mono text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          {String(payment.id).slice(0, 8)}…
                          {copiedId === payment.id
                            ? <Check size={11} className="text-green-500" strokeWidth={2.5} />
                            : <Copy size={11} strokeWidth={2} />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-2 font-medium">{payment.order_id}</td>
                      <td className="px-4 py-2">
                        <div className="tabular-nums font-medium">{payment.currency || 'USD'} {formatNumber(payment.price)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {[payment.channel, payment.country, payment.locale].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass(payment.status, payment.timing?.state)}`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {formatDateTime(payment.created_at)}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div>{payment.timing?.processing_duration ?? '—'}</div>
                        <div className="text-gray-400 mt-0.5">{formatDateTime(payment.timing?.last_provider_update_at)}</div>
                      </td>
                      <td className="px-4 py-2">
                        <ProviderBrand alias={payment.provider} label={payment.provider} variant="compact" />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Link
                            href={route('payments.show', payment.id)}
                            className="text-indigo-600 text-xs font-medium hover:text-indigo-800 transition-colors"
                          >
                            View details →
                          </Link>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => toggleWorkflow(payment.id)}
                            className="inline-flex items-center gap-0.5 text-slate-500 text-xs hover:text-slate-700 transition-colors"
                          >
                            {openWorkflow === payment.id
                              ? <><ChevronUp size={11} strokeWidth={2} />Hide</>
                              : <><ChevronDown size={11} strokeWidth={2} />Log</>
                            }
                          </button>
                        </div>
                      </td>
                    </tr>

                    {openWorkflow === payment.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="border-l-4 border-indigo-500 pl-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-gray-900">Payment Timeline</h3>
                                  <ProviderBrand alias={payment.provider} label={payment.provider} variant="compact" />
                                </div>
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
