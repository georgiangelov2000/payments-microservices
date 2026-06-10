import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { fmt, fmtDate } from '@/utils';
import {
    ArrowLeft, CreditCard, CheckCircle2, XCircle, Clock, Zap,
    AlertTriangle, RefreshCcw, SkipForward, Globe, Hash,
    Calendar, Tag, MapPin, Monitor, Smartphone,
} from 'lucide-react';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META = {
    finished:           { Icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
    payment_finished:   { Icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
    failed:             { Icon: XCircle,      color: 'text-red-600   bg-red-50   border-red-200'   },
    payment_failed:     { Icon: XCircle,      color: 'text-red-600   bg-red-50   border-red-200'   },
    pending:            { Icon: Clock,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
    payment_pending:    { Icon: Clock,        color: 'text-amber-600 bg-amber-50 border-amber-200' },
    cancelled:          { Icon: XCircle,      color: 'text-slate-600 bg-slate-50 border-slate-200' },
    payment_cancelled:  { Icon: XCircle,      color: 'text-slate-600 bg-slate-50 border-slate-200' },
    refunded:           { Icon: RefreshCcw,   color: 'text-blue-600  bg-blue-50  border-blue-200'  },
};

function StatusBadge({ status }) {
    const key = status?.toLowerCase().replace(/ /g, '_');
    const meta = STATUS_META[key] ?? { Icon: AlertTriangle, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    const { Icon } = meta;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold capitalize ${meta.color}`}>
            <Icon size={14} strokeWidth={2} />
            {status}
        </span>
    );
}

// ─── Attempt status icon ──────────────────────────────────────────────────────

function AttemptIcon({ status }) {
    switch (status) {
        case 'succeeded': return <CheckCircle2 size={16} strokeWidth={2} className="text-green-500" />;
        case 'timeout':   return <Clock        size={16} strokeWidth={2} className="text-amber-500" />;
        case 'skipped':   return <SkipForward  size={16} strokeWidth={2} className="text-slate-400" />;
        default:          return <XCircle      size={16} strokeWidth={2} className="text-red-500"   />;
    }
}

function attemptRowColor(status) {
    if (status === 'succeeded') return 'border-green-200 bg-green-50';
    if (status === 'timeout')   return 'border-amber-200 bg-amber-50';
    if (status === 'skipped')   return 'border-slate-200 bg-slate-50';
    return 'border-red-200 bg-red-50';
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }) {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <span className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400 pt-0.5">
                {label}
            </span>
            <span className={`flex-1 text-sm text-slate-800 break-all ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
            </span>
        </div>
    );
}

// ─── Timeline event ───────────────────────────────────────────────────────────

function TimelineEvent({ event, isLast }) {
    return (
        <div className="flex gap-4">
            {/* Spine */}
            <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Zap size={14} strokeWidth={2} />
                </div>
                {!isLast && <div className="mt-1 w-0.5 flex-1 bg-slate-200" />}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{event.event_type}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                        event.status === 'success' || event.status === 'log_success'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : event.status === 'failed' || event.status === 'log_failed'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>{event.status}</span>
                </div>
                {event.message && (
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed break-words whitespace-pre-wrap">{event.message}</p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">{fmtDate(event.timestamp)}</p>

                {event.payload && typeof event.payload === 'object' && Object.keys(event.payload).length > 0 && (
                    <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-800">
                            View payload
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] text-slate-100 max-h-48">
                            {JSON.stringify(event.payload, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentShow({ payment, timeline, routing_attempts }) {
    const meta = payment.routing_metadata ?? {};
    const candidates = meta.candidate_order ?? [];
    const matchedRule = meta.matched_rule;
    const snapshot = meta.snapshot ?? {};

    const channelIcon = payment.channel === 'mobile' ? Smartphone : Monitor;

    return (
        <AuthenticatedLayout>
            <Head title={`Payment #${payment.order_id}`} />

            <div className="mx-auto max-w-5xl space-y-6 p-6">

                {/* Back link */}
                <Link
                    href={route('payments.index')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft size={15} strokeWidth={2} /> Back to payments
                </Link>

                {/* ── Header card ── */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order</p>
                            <h1 className="mt-0.5 font-mono text-2xl font-bold text-slate-900">
                                #{payment.order_id}
                            </h1>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StatusBadge status={payment.status} />
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                                    payment.environment === 'live'
                                        ? 'border-violet-200 bg-violet-50 text-violet-700'
                                        : 'border-slate-200 bg-slate-100 text-slate-600'
                                }`}>
                                    <Globe size={10} strokeWidth={2} />
                                    {payment.environment}
                                </span>
                                {payment.channel && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 capitalize">
                                        {React.createElement(channelIcon, { size: 10, strokeWidth: 2 })}
                                        {payment.channel}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-3xl font-bold text-slate-900">
                                {payment.currency} {fmt(payment.price)}
                            </p>
                            {payment.country && (
                                <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-400">
                                    <MapPin size={11} strokeWidth={2} /> {payment.country}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Two column layout ── */}
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

                    {/* ── Left: Timeline + Routing attempts ── */}
                    <div className="space-y-6">

                        {/* Provider attempt trail */}
                        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 px-5 py-4">
                                <h2 className="text-base font-semibold text-slate-900">Provider Attempt Trail</h2>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    {routing_attempts.length === 0
                                        ? 'No provider attempts recorded'
                                        : `${routing_attempts.length} attempt${routing_attempts.length > 1 ? 's' : ''} — strategy: ${payment.routing_strategy ?? '—'}`
                                    }
                                </p>
                            </div>

                            {routing_attempts.length === 0 ? (
                                <div className="px-5 py-10 text-center">
                                    <CreditCard size={28} strokeWidth={1.25} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm text-slate-400">No routing attempts recorded yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {routing_attempts.map((attempt, i) => (
                                        <div key={i} className={`px-5 py-4 ${i === 0 ? '' : ''}`}>
                                            <div className={`flex items-start gap-3 rounded-xl border p-3.5 ${attemptRowColor(attempt.status)}`}>
                                                {/* Number + icon */}
                                                <div className="flex flex-col items-center gap-1.5 shrink-0">
                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm text-xs font-bold text-slate-600">
                                                        {attempt.attempt_number}
                                                    </span>
                                                    <AttemptIcon status={attempt.status} />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold capitalize text-slate-900">{attempt.provider_alias}</span>
                                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                            attempt.status === 'succeeded'
                                                                ? 'bg-green-100 text-green-700'
                                                                : attempt.status === 'timeout'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : attempt.status === 'skipped'
                                                                ? 'bg-slate-100 text-slate-500'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}>{attempt.status}</span>
                                                        {attempt.latency_ms != null && (
                                                            <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                <Zap size={11} strokeWidth={2} />
                                                                {attempt.latency_ms.toLocaleString()} ms
                                                            </span>
                                                        )}
                                                    </div>

                                                    {attempt.error_code && (
                                                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                                                            <AlertTriangle size={12} strokeWidth={2} className="text-red-400 shrink-0" />
                                                            <span className="font-mono">{attempt.error_code}</span>
                                                            {attempt.error_message && (
                                                                <span className="text-slate-400 truncate max-w-xs">— {attempt.error_message}</span>
                                                            )}
                                                        </p>
                                                    )}

                                                    <p className="mt-1 text-[11px] text-slate-400">{fmtDate(attempt.timestamp)}</p>
                                                </div>
                                            </div>

                                            {/* Failover arrow */}
                                            {i < routing_attempts.length - 1 && attempt.status !== 'succeeded' && (
                                                <div className="mt-2 flex items-center gap-2 px-3">
                                                    <div className="flex-1 border-t border-dashed border-slate-300" />
                                                    <span className="text-[10px] font-medium text-slate-400">failover</span>
                                                    <RefreshCcw size={11} strokeWidth={2} className="text-slate-400" />
                                                    <div className="flex-1 border-t border-dashed border-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Event log timeline */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-5 text-base font-semibold text-slate-900">Event Timeline</h2>
                            {timeline.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-6">No events logged.</p>
                            ) : (
                                <div>
                                    {timeline.map((event, i) => (
                                        <TimelineEvent key={i} event={event} isLast={i === timeline.length - 1} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ── Right: Payment details sidebar ── */}
                    <div className="space-y-4">

                        {/* Payment details */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Payment Details</h3>
                            <InfoRow label="Payment ID"      value={payment.id}              mono />
                            <InfoRow label="Order ID"        value={payment.order_id}         />
                            <InfoRow label="Provider"        value={payment.provider_name ?? payment.provider} />
                            <InfoRow label="Reference"       value={payment.provider_reference} mono />
                            <InfoRow label="Idempotency Key" value={payment.idempotency_key}  mono />
                            <InfoRow label="Created"         value={fmtDate(payment.created_at)} />
                            <InfoRow label="Updated"         value={fmtDate(payment.updated_at)} />
                        </div>

                        {/* Routing decision */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-3 text-sm font-semibold text-slate-700">Routing Decision</h3>
                            <InfoRow label="Strategy"     value={payment.routing_strategy} />
                            {matchedRule && (
                                <InfoRow label="Matched Rule" value={matchedRule} mono />
                            )}
                            {candidates.length > 0 && (
                                <div className="py-2.5 border-b border-slate-100">
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                        Candidate Order
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {candidates.map((alias, i) => (
                                            <span key={alias} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700">
                                                <span className="h-4 w-4 flex items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold">
                                                    {i + 1}
                                                </span>
                                                {alias}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {snapshot.weights && (
                                <div className="py-2.5">
                                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                        Weight Distribution
                                    </span>
                                    {Object.entries(snapshot.weights).map(([alias, w]) => (
                                        <div key={alias} className="flex items-center gap-2 mb-1">
                                            <span className="w-16 text-xs capitalize text-slate-600">{alias}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${w}%` }} />
                                            </div>
                                            <span className="w-8 text-right text-xs font-semibold text-slate-700">{w}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Provider checkout link */}
                        {payment.provider_checkout_url && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-3 text-sm font-semibold text-slate-700">Checkout URL</h3>
                                <a
                                    href={payment.provider_checkout_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-indigo-600 hover:text-indigo-800 break-all leading-relaxed"
                                >
                                    {payment.provider_checkout_url}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
