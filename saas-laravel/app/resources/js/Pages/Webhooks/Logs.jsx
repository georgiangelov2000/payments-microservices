
import i18n from '@/i18n';
import { useState } from 'react'
import { Head, Link, useForm, router } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import {
    Webhook, CheckCircle2, XCircle, Clock, RotateCcw,
    ChevronDown, ChevronUp, SlidersHorizontal, ArrowLeft,
    AlertTriangle, Send, RefreshCw,
} from 'lucide-react'
import { fmtDate } from '@/utils'

const fmt = fmtDate

const EVENT_COLORS = {
    'payment.succeeded': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'payment.failed':    'bg-red-50 text-red-600 border-red-200',
    'payment.cancelled': 'bg-slate-100 text-slate-600 border-slate-300',
    'payment.created':   'bg-blue-50 text-blue-700 border-blue-200',
    'payment.pending':   'bg-yellow-50 text-yellow-700 border-yellow-200',
    'ping':              'bg-purple-50 text-purple-700 border-purple-200',
}

const STATUS_CONFIG = {
    delivered: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, label: i18n.t('generated.common.delivered') },
    failed:    { color: 'bg-red-50 text-red-600 border-red-200',             icon: XCircle,      label: i18n.t('generated.common.failed') },
    retrying:  { color: 'bg-amber-50 text-amber-700 border-amber-200',       icon: RefreshCw,    label: i18n.t('generated.common.retrying') },
    pending:   { color: 'bg-slate-100 text-slate-500 border-slate-200',      icon: Clock,        label: i18n.t('generated.common.pending') },
}

function EventBadge({ event }) {
    const cls = EVENT_COLORS[event] ?? 'bg-slate-100 text-slate-600 border-slate-200'
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium font-mono ${cls}`}>
            {event}
        </span>
    )
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
            <Icon size={11} strokeWidth={2} />
            {cfg.label}
        </span>
    )
}

function HttpCode({ code }) {
    if (!code) return <span className="text-slate-400 text-xs">—</span>
    const color = code >= 200 && code < 300
        ? 'text-emerald-600 font-semibold'
        : code >= 400
            ? 'text-red-600 font-semibold'
            : 'text-amber-600 font-semibold'
    return <span className={`font-mono text-xs ${color}`}>{code}</span>
}

function DeliveryRow({ delivery }) {
    const [open, setOpen] = useState(false)

    const hasDetail = delivery.payload || delivery.response_body || delivery.last_error

    return (
        <>
            <tr className="border-b hover:bg-slate-50 transition-colors">
                {/* Sent at */}
                <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {fmt(delivery.created_at)}
                </td>

                {/* Event */}
                <td className="px-4 py-2">
                    <EventBadge event={delivery.event} />
                </td>

                {/* Endpoint */}
                <td className="px-4 py-2 max-w-[220px]">
                    <p className="text-xs font-mono text-slate-700 truncate" title={delivery.webhook_url}>
                        {delivery.webhook_url ?? '—'}
                    </p>
                    {delivery.webhook_desc && (
                        <p className="text-[11px] text-slate-400 truncate">{delivery.webhook_desc}</p>
                    )}
                </td>

                {/* Status */}
                <td className="px-4 py-2 whitespace-nowrap">
                    <StatusBadge status={delivery.status} />
                </td>

                {/* HTTP code */}
                <td className="px-4 py-2 text-center">
                    <HttpCode code={delivery.response_code} />
                </td>

                {/* Attempts */}
                <td className="px-4 py-2 text-center text-xs text-slate-500">
                    {delivery.attempts}
                </td>

                {/* Delivered at */}
                <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {delivery.status === 'delivered' ? fmt(delivery.delivered_at) : (
                        delivery.next_retry_at
                            ? <span className="text-amber-600">{i18n.t('generated.webhooks_Logs.retry')}{' '}{fmt(delivery.next_retry_at)}</span>
                            : '—'
                    )}
                </td>

                {/* Payment link */}
                <td className="px-4 py-2">
                    {delivery.payment_id ? (
                        <Link
                            href={route('payments.show', delivery.payment_id)}
                            className="font-mono text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                            title={delivery.payment_id}
                        >
                            {String(delivery.payment_id).slice(0, 8)}…
                        </Link>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </td>

                {/* Expand */}
                <td className="px-4 py-2 text-center">
                    {hasDetail && (
                        <button
                            onClick={() => setOpen(o => !o)}
                            className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-700 transition-colors"
                        >
                            {open
                                ? <><ChevronUp size={13} strokeWidth={2} />{i18n.t('generated.webhooks_Logs.hide')}</>
                                : <><ChevronDown size={13} strokeWidth={2} />{i18n.t('generated.webhooks_Logs.details')}</>}
                        </button>
                    )}
                </td>
            </tr>

            {open && (
                <tr className="bg-slate-50 border-b">
                    <td colSpan={9} className="px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {delivery.payload && (
                                <Section title={i18n.t('generated.webhooks_Logs.requestPayload')} icon={Send}>
                                    <JsonBlock value={delivery.payload} />
                                </Section>
                            )}
                            {delivery.response_body && (
                                <Section title={i18n.t('generated.webhooks_Logs.responseBody')} icon={CheckCircle2}>
                                    <pre className="whitespace-pre-wrap break-words text-xs text-slate-700 leading-relaxed max-h-52 overflow-auto">
                                        {delivery.response_body}
                                    </pre>
                                </Section>
                            )}
                            {delivery.last_error && (
                                <Section title={i18n.t('generated.webhooks_Logs.lastError')} icon={AlertTriangle} accent="red">
                                    <pre className="whitespace-pre-wrap break-words text-xs text-red-700 leading-relaxed max-h-52 overflow-auto">
                                        {delivery.last_error}
                                    </pre>
                                </Section>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

function Section({ title, icon: Icon, accent = 'slate', children }) {
    const border = accent === 'red' ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'
    const header = accent === 'red' ? 'text-red-600' : 'text-slate-600'
    return (
        <div className={`rounded-lg border ${border} p-3`}>
            <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${header}`}>
                <Icon size={11} strokeWidth={2} />
                {title}
            </p>
            {children}
        </div>
    )
}

function JsonBlock({ value }) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return (
        <pre className="whitespace-pre-wrap break-words text-xs text-slate-700 leading-relaxed max-h-52 overflow-auto">
            {text}
        </pre>
    )
}

export default function WebhookLogs({ deliveries, endpoints, events, filters = {} }) {
    const rows = deliveries.data ?? []

    const { data, setData, get, processing } = useForm({
        webhook_id: filters.webhook_id || '',
        event:      filters.event      || '',
        status:     filters.status     || '',
        from:       filters.from       || '',
        to:         filters.to         || '',
    })

    const submit = (e) => {
        e.preventDefault()
        get(route('webhooks.logs'), { preserveScroll: true })
    }

    const reset = () => {
        setData({ webhook_id: '', event: '', status: '', from: '', to: '' })
        router.get(route('webhooks.logs'), {}, { preserveScroll: true, replace: true })
    }

    const totalDelivered = rows.filter(r => r.status === 'delivered').length
    const totalFailed    = rows.filter(r => r.status === 'failed').length

    return (
        <AuthenticatedLayout>
            <Head title={i18n.t('generated.webhooks_Logs.webhookLogs')} />

            <div className="p-6 max-w-7xl mx-auto space-y-5">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('webhooks.index')}
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <ArrowLeft size={13} strokeWidth={2} />{i18n.t('generated.webhooks_Logs.endpoints')}</Link>
                        <span className="text-slate-300">/</span>
                        <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <Webhook size={18} strokeWidth={1.75} className="text-indigo-600" />{i18n.t('generated.webhooks_Logs.deliveryLogs')}</h1>
                    </div>

                    {/* Page-level stats */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            {deliveries.total}{i18n.t('generated.webhooks_Logs.total')}</span>
                        <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            {totalDelivered}{i18n.t('generated.webhooks_Logs.deliveredThisPage')}</span>
                        {totalFailed > 0 && (
                            <span className="flex items-center gap-1 text-red-500 font-medium">
                                <XCircle size={12} />
                                {totalFailed}{i18n.t('generated.webhooks_Logs.failedThisPage')}</span>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <form
                    onSubmit={submit}
                    className="bg-white rounded-lg border p-4 grid gap-3 md:grid-cols-6 items-end"
                >
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.webhooks_Logs.endpoint')}</label>
                        <select
                            value={data.webhook_id}
                            onChange={e => setData('webhook_id', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                        >
                            <option value="">{i18n.t('generated.webhooks_Logs.allEndpoints')}</option>
                            {endpoints.map(ep => (
                                <option key={ep.id} value={ep.id}>
                                    {ep.desc ? `${ep.desc} — ` : ''}{ep.url}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.webhooks_Logs.event')}</label>
                        <select
                            value={data.event}
                            onChange={e => setData('event', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                        >
                            <option value="">{i18n.t('generated.webhooks_Logs.allEvents')}</option>
                            {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.webhooks_Logs.status')}</label>
                        <select
                            value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                        >
                            <option value="">{i18n.t('generated.webhooks_Logs.allStatuses')}</option>
                            <option value="delivered">{i18n.t('generated.webhooks_Logs.delivered')}</option>
                            <option value="failed">Failed</option>
                            <option value="retrying">{i18n.t('generated.webhooks_Logs.retrying')}</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.webhooks_Logs.from')}</label>
                        <input
                            type="date"
                            value={data.from}
                            onChange={e => setData('from', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.webhooks_Logs.to')}</label>
                        <input
                            type="date"
                            value={data.to}
                            onChange={e => setData('to', e.target.value)}
                            className="w-full rounded border-gray-300 text-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            <SlidersHorizontal size={13} strokeWidth={2} />{i18n.t('common.actions.filter')}</button>
                        <button
                            type="button"
                            onClick={reset}
                            className="inline-flex items-center justify-center gap-1 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <RotateCcw size={13} strokeWidth={2} />{i18n.t('common.actions.reset')}</button>
                    </div>
                </form>

                {/* Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.sentAt')}</th>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.event')}</th>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.endpoint')}</th>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.status')}</th>
                                <th className="px-4 py-2 font-medium text-center">HTTP</th>
                                <th className="px-4 py-2 font-medium text-center">{i18n.t('generated.webhooks_Logs.attempts')}</th>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.resolvedAt')}</th>
                                <th className="px-4 py-2 font-medium">{i18n.t('generated.webhooks_Logs.payment')}</th>
                                <th className="px-4 py-2 font-medium text-center">{i18n.t('generated.webhooks_Logs.details')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-14 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Webhook size={32} strokeWidth={1.25} />
                                            <span className="text-sm font-medium">{i18n.t('generated.webhooks_Logs.noDeliveriesFound')}</span>
                                            <span className="text-xs">{i18n.t('generated.webhooks_Logs.tryAdjustingTheFiltersAbove')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(d => <DeliveryRow key={d.id} delivery={d} />)
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {deliveries.links?.length > 1 && (
                    <div className="flex justify-center gap-1 flex-wrap">
                        {deliveries.links.map(link => (
                            <Link
                                key={link.label}
                                href={link.url ?? '#'}
                                preserveScroll
                                className={`px-3 py-1 text-sm rounded border ${
                                    link.active
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white hover:bg-gray-100'
                                } ${!link.url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    )
}
