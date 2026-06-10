import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import Badge from '@/Components/Badge'
import { getProviderMeta, ProviderIcon } from '@/Components/ProviderBrand'
import {
    GitBranch, Activity, Shield, CheckCircle2, XCircle,
    AlertTriangle, Clock, ChevronDown, ChevronUp,
    ArrowRight, RefreshCw, Lock,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (v) => {
    if (!v) return '—'
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? v : d.toLocaleString('sv-SE')
}

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

// ─────────────────────────────────────────────────────────────────────────────
// ProviderPill
// ─────────────────────────────────────────────────────────────────────────────

function ProviderPill({ alias }) {
    const meta = getProviderMeta(alias)
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <ProviderIcon alias={alias} size="xs" className="shadow-none ring-0" />
            {meta?.label ?? capitalize(alias)}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFlowSummary
// ─────────────────────────────────────────────────────────────────────────────

function buildFlowSummary(nodes) {
    const providers = (nodes ?? []).filter(n => n.type === 'provider' && (n.data?.provider_alias || n.provider_alias))
    if (!providers.length) return null

    const aliases = providers
        .sort((a, b) => (a.data?.priority ?? a.priority ?? 99) - (b.data?.priority ?? b.priority ?? 99))
        .map(n => capitalize(n.data?.provider_alias ?? n.provider_alias))

    return `Visual workflow with processors: ${aliases.join(', ')}.`
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowCard — compact read-only card matching the admin layout
// ─────────────────────────────────────────────────────────────────────────────

function WorkflowCard({ workflow }) {
    const [showAllVersions, setShowAllVersions] = useState(false)

    const providers = (workflow.nodes ?? [])
        .filter(n => n.type === 'provider' && (n.data?.provider_alias || n.provider_alias))
        .sort((a, b) => (a.data?.priority ?? a.priority ?? 99) - (b.data?.priority ?? b.priority ?? 99))
        .map(n => n.data?.provider_alias ?? n.provider_alias)

    const summary = buildFlowSummary(workflow.nodes)

    const versions = workflow.versions ?? []
    const visibleVersions = showAllVersions ? versions : versions.slice(0, 4)

    const envLabel = workflow.environment === 'live' ? 'Live payments' : 'Test mode'
    const isPublished = workflow.status === 'published'

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{workflow.name}</h3>

                        {/* Status pill — green dot for published */}
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            isPublished
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}>
                            {isPublished && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                            {capitalize(workflow.status)}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                        {envLabel}
                        {workflow.current_version && (
                            <span className="ml-2 font-mono text-slate-400">v{workflow.current_version}</span>
                        )}
                    </p>
                </div>

                {/* Read-only indicator */}
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-400">
                    <Lock size={12} strokeWidth={2} />
                    Read-only
                </div>
            </div>

            {/* ── Payment Flow ─────────────────────────────────────────────── */}
            {providers.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Payment Flow
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {providers.map((alias, i) => (
                            <div key={`${alias}-${i}`} className="flex items-center gap-2">
                                {i > 0 && (
                                    <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />
                                )}
                                <ProviderPill alias={alias} />
                            </div>
                        ))}
                        <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />
                        <span className="text-xs italic text-slate-400">Visual workflow</span>
                    </div>

                    {summary && (
                        <p className="text-sm text-slate-500">{summary}</p>
                    )}
                </div>
            )}

            {/* ── Version history ──────────────────────────────────────────── */}
            {versions.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">Version history:</span>
                    {visibleVersions.map(v => (
                        <span
                            key={v.id}
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                v.status === 'published'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                            v{v.version}
                        </span>
                    ))}
                    {versions.length > 4 && (
                        <button
                            onClick={() => setShowAllVersions(s => !s)}
                            className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showAllVersions
                                ? <><ChevronUp size={11} strokeWidth={2} /> less</>
                                : <><ChevronDown size={11} strokeWidth={2} /> +{versions.length - 4} more</>
                            }
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryStrip — 3 summary cards matching the admin layout
// ─────────────────────────────────────────────────────────────────────────────

function SummaryStrip({ summary }) {
    const allHealthy   = summary.unhealthy_providers === 0
    const liveRoutes   = summary.published_workflows ?? 0
    const failedCount  = summary.failed_attempts ?? 0

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {/* System Status */}
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${
                allHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    allHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}>
                    {allHealthy
                        ? <CheckCircle2 size={22} strokeWidth={1.75} />
                        : <AlertTriangle size={22} strokeWidth={1.75} />
                    }
                </span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        System Status
                    </p>
                    <p className={`mt-0.5 text-sm font-semibold ${allHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
                        {allHealthy
                            ? 'All processors running normally'
                            : `${summary.unhealthy_providers} provider${summary.unhealthy_providers > 1 ? 's' : ''} unhealthy`
                        }
                    </p>
                </div>
            </div>

            {/* Live Payment Routes */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-3xl font-bold text-indigo-600">
                    {liveRoutes}
                </span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Live Payment Routes
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                        {liveRoutes === 1 ? '1 route actively routing payments' : `${liveRoutes} routes actively routing payments`}
                    </p>
                </div>
            </div>

            {/* Failed Attempts */}
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${
                failedCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white shadow-sm'
            }`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-3xl font-bold ${
                    failedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                }`}>
                    {failedCount}
                </span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Failed Attempts
                    </p>
                    <p className={`mt-0.5 text-sm font-semibold ${failedCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {failedCount > 0
                            ? `${failedCount} payment${failedCount > 1 ? 's' : ''} failed to route`
                            : 'No failed attempts'
                        }
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProviderHealthPanel
// ─────────────────────────────────────────────────────────────────────────────

function ProviderHealthPanel({ health }) {
    if (!health?.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                <Activity size={28} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No provider health data yet.</p>
                <p className="text-xs text-slate-400 mt-1">Health records are created automatically when payments are processed.</p>
            </div>
        )
    }

    const statusIcon = (s) => {
        if (s === 'healthy') return <CheckCircle2 size={14} className="text-emerald-500" strokeWidth={2} />
        if (s === 'unhealthy' || s === 'disabled') return <XCircle size={14} className="text-red-500" strokeWidth={2} />
        return <AlertTriangle size={14} className="text-amber-500" strokeWidth={2} />
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((h, i) => (
                <div
                    key={i}
                    className={[
                        'rounded-xl border p-4 space-y-2',
                        h.status === 'unhealthy' || h.status === 'disabled'
                            ? 'border-red-200 bg-red-50/40'
                            : h.status === 'degraded'
                                ? 'border-amber-200 bg-amber-50/40'
                                : 'border-slate-200 bg-white',
                    ].join(' ')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {statusIcon(h.status)}
                            <span className="font-semibold text-sm text-slate-800">{capitalize(h.provider_alias)}</span>
                        </div>
                        <Badge variant={h.status}>{capitalize(h.status)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                        <p>Environment: <span className="font-medium text-slate-700">{capitalize(h.environment)}</span></p>
                        <p>Consecutive failures: <span className={`font-medium ${h.consecutive_failures > 0 ? 'text-red-600' : 'text-slate-700'}`}>{h.consecutive_failures}</span></p>
                        {h.failure_rate > 0 && (
                            <p>Failure rate: <span className="font-medium text-amber-600">{h.failure_rate}%</span></p>
                        )}
                        {h.disabled_until && (
                            <p className="text-red-600">Disabled until: {fmt(h.disabled_until)}</p>
                        )}
                        {h.last_success_at && (
                            <p>Last success: {fmt(h.last_success_at)}</p>
                        )}
                        {h.last_failure_at && (
                            <p>Last failure: {fmt(h.last_failure_at)}</p>
                        )}
                        {h.last_error && (
                            <p className="text-red-600 truncate" title={h.last_error}>Error: {h.last_error}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityFeed — recent routing attempts
// ─────────────────────────────────────────────────────────────────────────────

function ActivityFeed({ attempts }) {
    if (!attempts?.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                <RefreshCw size={28} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No routing attempts yet.</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-xs text-left text-slate-500 uppercase tracking-wide">
                    <tr>
                        <th className="px-4 py-2.5 font-semibold">Time</th>
                        <th className="px-4 py-2.5 font-semibold">Provider</th>
                        <th className="px-4 py-2.5 font-semibold">Strategy</th>
                        <th className="px-4 py-2.5 font-semibold text-center">Attempt</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Latency</th>
                        <th className="px-4 py-2.5 font-semibold">Payment</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {attempts.map(a => (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmt(a.created_at)}</td>
                            <td className="px-4 py-2.5">
                                <ProviderPill alias={a.provider_alias} />
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500">{capitalize(a.strategy)}</td>
                            <td className="px-4 py-2.5 text-xs text-slate-500 text-center">#{a.attempt_number}</td>
                            <td className="px-4 py-2.5">
                                <Badge variant={a.status === 'success' ? 'success' : a.status === 'failed' ? 'failed' : 'default'}>
                                    {capitalize(a.status)}
                                </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-slate-500 text-right font-mono">
                                {a.latency_ms != null ? `${a.latency_ms}ms` : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                                {a.payment_id ? (
                                    <Link
                                        href={route('payments.show', a.payment_id)}
                                        className="font-mono text-xs text-indigo-600 hover:text-indigo-800"
                                        title={a.payment_id}
                                    >
                                        {String(a.payment_id).slice(0, 8)}…
                                    </Link>
                                ) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Payment Routes', 'Processor Health', 'Recent Activity']

export default function RoutingIndex({ workflows, health, attempts, summary }) {
    const [tab, setTab] = useState('Payment Routes')

    const unhealthyCount = summary?.unhealthy_providers ?? 0

    return (
        <AuthenticatedLayout>
            <Head title="Routing" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* ── Page header ──────────────────────────────────────────── */}
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">
                        Payment Routing
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Control how customer payments are distributed across your payment processors.
                    </p>
                </div>

                {/* ── Summary strip ─────────────────────────────────────────── */}
                <SummaryStrip summary={summary ?? {}} />

                {/* ── Tab nav ───────────────────────────────────────────────── */}
                <div className="flex gap-1 border-b border-slate-200">
                    {TABS.map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={[
                                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                                tab === t
                                    ? 'text-indigo-600 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700',
                            ].join(' ')}
                        >
                            {t}
                            {t === 'Processor Health' && unhealthyCount > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                    {unhealthyCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab content ───────────────────────────────────────────── */}
                {tab === 'Payment Routes' && (
                    <div className="space-y-4">
                        {workflows?.length > 0 ? (
                            workflows.map(w => <WorkflowCard key={w.id} workflow={w} />)
                        ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
                                <GitBranch size={30} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-600">No routing workflows configured</p>
                                <p className="text-xs text-slate-400 mt-1">Your administrator will set up routing workflows for your account.</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'Processor Health' && (
                    <ProviderHealthPanel health={health} />
                )}

                {tab === 'Recent Activity' && (
                    <ActivityFeed attempts={attempts} />
                )}
            </div>
        </AuthenticatedLayout>
    )
}
