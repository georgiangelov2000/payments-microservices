import { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import {
    GitBranch, Activity, Shield, CheckCircle2, XCircle,
    AlertTriangle, Clock, ChevronDown, ChevronUp,
    ArrowRight, Zap, RefreshCw, Lock,
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

function Badge({ children, variant = 'default' }) {
    const cls = {
        published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        draft:     'bg-amber-50 text-amber-700 border-amber-200',
        archived:  'bg-slate-100 text-slate-500 border-slate-200',
        healthy:   'bg-emerald-50 text-emerald-700 border-emerald-200',
        unhealthy: 'bg-red-50 text-red-600 border-red-200',
        degraded:  'bg-amber-50 text-amber-700 border-amber-200',
        disabled:  'bg-slate-100 text-slate-500 border-slate-200',
        success:   'bg-emerald-50 text-emerald-700 border-emerald-200',
        failed:    'bg-red-50 text-red-600 border-red-200',
        default:   'bg-slate-100 text-slate-600 border-slate-200',
    }[variant] ?? 'bg-slate-100 text-slate-600 border-slate-200'
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
            {children}
        </span>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ProviderFlow — visual pill chain built from nodes/edges
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_ICONS = {
    stripe:  '💳',
    paypal:  '🅿',
}

function ProviderPill({ alias, type }) {
    const icon = PROVIDER_ICONS[alias?.toLowerCase()] ?? '⚡'
    const bg = {
        provider: 'bg-white border-slate-200 text-slate-700',
        failover: 'bg-orange-50 border-orange-200 text-orange-700',
        weighted: 'bg-purple-50 border-purple-200 text-purple-700',
        success:  'bg-emerald-50 border-emerald-200 text-emerald-700',
        failure:  'bg-red-50 border-red-200 text-red-600',
        start:    'bg-indigo-50 border-indigo-200 text-indigo-700',
    }[type] ?? 'bg-white border-slate-200 text-slate-700'

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${bg}`}>
            <span>{icon}</span>
            {alias ? capitalize(alias) : type === 'start' ? 'Request' : type === 'success' ? 'Success' : 'Failed'}
        </span>
    )
}

function ProviderFlow({ nodes, edges }) {
    if (!nodes?.length) {
        return <p className="text-xs text-slate-400 italic">No flow configured yet.</p>
    }

    // Build an ordered path: start → providers (by priority) → terminal
    const byId = Object.fromEntries((nodes).map(n => [n.id, n]))
    const edgeMap = {}
    for (const e of (edges ?? [])) {
        if (!edgeMap[e.source]) edgeMap[e.source] = []
        edgeMap[e.source].push(e)
    }

    // Walk from start node
    const startNode = nodes.find(n => n.type === 'start')
    if (!startNode) {
        // Fallback: just sort providers by priority
        const providers = nodes
            .filter(n => n.type === 'provider' && n.data?.provider_alias)
            .sort((a, b) => (a.data?.priority ?? 99) - (b.data?.priority ?? 99))
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {providers.map((n, i) => (
                    <div key={n.id} className="flex items-center gap-1.5">
                        {i > 0 && <ArrowRight size={12} className="text-slate-300" />}
                        <ProviderPill alias={n.data.provider_alias} type="provider" />
                    </div>
                ))}
            </div>
        )
    }

    // BFS to build a linear path (first success edge at each step)
    const path = []
    const visited = new Set()
    let current = startNode.id

    while (current && !visited.has(current)) {
        visited.add(current)
        const node = byId[current]
        if (node) path.push(node)
        if (node?.type === 'success' || node?.type === 'failure') break
        const outEdges = edgeMap[current] ?? []
        // Prefer 'success' or 'output' handles; fall back to first edge
        const next = outEdges.find(e => e.sourceHandle === 'success' || e.sourceHandle === 'output') ?? outEdges[0]
        current = next?.target
    }

    const display = path.filter(n => n.type !== 'start' || path.length === 1)

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {path[0]?.type === 'start' && (
                <>
                    <ProviderPill alias={null} type="start" />
                    {display.length > 0 && <ArrowRight size={12} className="text-slate-300" />}
                </>
            )}
            {display.map((n, i) => (
                <div key={n.id} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight size={12} className="text-slate-300" />}
                    <ProviderPill alias={n.data?.provider_alias} type={n.type} />
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFlowSummary — plain-English description of the routing strategy
// ─────────────────────────────────────────────────────────────────────────────

function buildFlowSummary(nodes, edges) {
    const providers = (nodes ?? []).filter(n => n.type === 'provider' && n.data?.provider_alias)
    if (!providers.length) return 'No providers configured.'

    const weighted = providers.filter(n => n.data?.weight > 0)
    if (weighted.length > 1) {
        const parts = weighted
            .sort((a, b) => (b.data.weight ?? 0) - (a.data.weight ?? 0))
            .map(n => `${capitalize(n.data.provider_alias)} ${n.data.weight}%`)
        return `Split traffic: ${parts.join(', ')}.`
    }

    const sorted = [...providers].sort((a, b) => (a.data?.priority ?? 99) - (b.data?.priority ?? 99))
    if (sorted.length === 1) return `Route all traffic to ${capitalize(sorted[0].data.provider_alias)}.`
    const primary = capitalize(sorted[0].data.provider_alias)
    const fallbacks = sorted.slice(1).map(n => capitalize(n.data.provider_alias)).join(' → ')
    return `Primary: ${primary}. Failover: ${fallbacks}.`
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowCard
// ─────────────────────────────────────────────────────────────────────────────

function WorkflowCard({ workflow }) {
    const [showVersions, setShowVersions] = useState(false)
    const summary = buildFlowSummary(workflow.nodes, workflow.edges)
    const hasErrors = workflow.validation_errors?.length > 0

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{workflow.name}</h3>
                        <Badge variant={workflow.status}>{capitalize(workflow.status)}</Badge>
                        <Badge variant="default">{capitalize(workflow.environment)}</Badge>
                        <span className="text-xs text-slate-400">v{workflow.current_version}</span>
                    </div>
                    {workflow.published_at && (
                        <p className="mt-0.5 text-xs text-slate-400">Published {fmt(workflow.published_at)}</p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <Lock size={12} className="text-slate-300" strokeWidth={2} />
                    <span className="text-xs text-slate-400">Read-only</span>
                </div>
            </div>

            {/* Flow visual */}
            <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Flow</p>
                <ProviderFlow nodes={workflow.nodes} edges={workflow.edges} />
                {summary && (
                    <p className="mt-2 text-xs text-slate-500">{summary}</p>
                )}
            </div>

            {/* Validation errors */}
            {hasErrors && (
                <div className="px-5 py-3 bg-red-50 border-b border-red-100">
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-1">
                        <AlertTriangle size={12} strokeWidth={2} />
                        Validation issues
                    </div>
                    <ul className="space-y-0.5">
                        {workflow.validation_errors.map((e, i) => (
                            <li key={i} className="text-xs text-red-600">{e}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Version history */}
            <div className="px-5 py-3">
                <button
                    onClick={() => setShowVersions(v => !v)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                    {showVersions ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                    {workflow.versions?.length ?? 0} version{workflow.versions?.length !== 1 ? 's' : ''}
                </button>
                {showVersions && workflow.versions?.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {workflow.versions.map(v => (
                            <div key={v.id} className="flex items-center gap-3 text-xs text-slate-500 py-1 border-t border-slate-50">
                                <span className="font-mono text-slate-400">v{v.version}</span>
                                <Badge variant={v.status ?? 'default'}>{capitalize(v.status ?? 'draft')}</Badge>
                                <span>{fmt(v.created_at)}</span>
                                {v.published_at && <span className="text-emerald-600">Published {fmt(v.published_at)}</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// TrafficSplitPanel — actual distribution from routing attempts
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_COLORS = {
    stripe:  'bg-indigo-500',
    paypal:  'bg-blue-500',
}

function TrafficSplitPanel({ trafficSplit }) {
    if (!trafficSplit?.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
                <Activity size={24} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No routing attempts recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Traffic data appears automatically once payments are processed.</p>
            </div>
        )
    }

    const totalRequests = trafficSplit.reduce((s, r) => s + r.total, 0)

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Actual traffic distribution</h3>
                <span className="text-xs text-slate-400">{totalRequests.toLocaleString()} total attempts</span>
            </div>
            <div className="px-5 py-4 space-y-5">
                {trafficSplit.map(r => {
                    const barColor = PROVIDER_COLORS[r.provider_alias?.toLowerCase()] ?? 'bg-slate-400'
                    const successColor = r.success_rate >= 90
                        ? 'text-emerald-600'
                        : r.success_rate >= 70
                            ? 'text-amber-600'
                            : 'text-red-600'
                    return (
                        <div key={r.provider_alias} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <ProviderPill alias={r.provider_alias} type="provider" />
                                    <span className="text-base font-bold text-slate-800">{r.pct}%</span>
                                    <span className="text-xs text-slate-400">{r.total} requests</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className={`font-medium ${successColor}`}>{r.success_rate}% success</span>
                                    {r.avg_latency_ms != null && (
                                        <span className="text-slate-400 font-mono">{r.avg_latency_ms}ms avg</span>
                                    )}
                                </div>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${barColor}`}
                                    style={{ width: `${r.pct}%` }}
                                />
                            </div>
                            <div className="flex gap-3 text-xs text-slate-400">
                                <span className="text-emerald-600">{r.succeeded} succeeded</span>
                                {r.failed > 0 && <span className="text-red-500">{r.failed} failed</span>}
                            </div>
                        </div>
                    )
                })}
            </div>
            {trafficSplit.length > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                        {trafficSplit.map(r => (
                            <div
                                key={r.provider_alias}
                                className={`h-full transition-all ${PROVIDER_COLORS[r.provider_alias?.toLowerCase()] ?? 'bg-slate-400'}`}
                                style={{ width: `${r.pct}%` }}
                                title={`${capitalize(r.provider_alias)}: ${r.pct}%`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        {trafficSplit.map(r => (
                            <div key={r.provider_alias} className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span className={`inline-block w-2.5 h-2.5 rounded-sm ${PROVIDER_COLORS[r.provider_alias?.toLowerCase()] ?? 'bg-slate-400'}`} />
                                {capitalize(r.provider_alias)} {r.pct}%
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// RoutingConfigCard — priority/weighted config
// ─────────────────────────────────────────────────────────────────────────────

function RoutingConfigCard({ config }) {
    const priorityChain = config.priority_chain ?? []
    const weighted = config.weighted_distribution ?? {}
    const weightedEntries = typeof weighted === 'object' && !Array.isArray(weighted)
        ? Object.entries(weighted)
        : []

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-700">{capitalize(config.environment)} config</h3>
                    <Badge variant={config.enabled ? 'published' : 'default'}>{config.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                <Badge variant="default">{capitalize(config.strategy)}</Badge>
            </div>

            {priorityChain.length > 0 && (
                <div>
                    <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Priority chain</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {priorityChain.map((alias, i) => (
                            <div key={alias} className="flex items-center gap-1.5">
                                {i > 0 && <ArrowRight size={11} className="text-slate-300" />}
                                <ProviderPill alias={alias} type="provider" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {weightedEntries.length > 1 && (
                <div>
                    <p className="text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Traffic split</p>
                    <div className="space-y-1.5">
                        {weightedEntries.map(([alias, pct]) => (
                            <div key={alias} className="flex items-center gap-2">
                                <span className="text-xs text-slate-600 w-20 shrink-0">{capitalize(alias)}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-medium text-slate-500 w-8 text-right">{pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
                <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                    <tr>
                        <th className="px-4 py-2 font-medium">Time</th>
                        <th className="px-4 py-2 font-medium">Provider</th>
                        <th className="px-4 py-2 font-medium">Strategy</th>
                        <th className="px-4 py-2 font-medium text-center">Attempt</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium text-right">Latency</th>
                        <th className="px-4 py-2 font-medium">Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {attempts.map(a => (
                        <tr key={a.id} className="border-b hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{fmt(a.created_at)}</td>
                            <td className="px-4 py-2">
                                <ProviderPill alias={a.provider_alias} type="provider" />
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-500">{capitalize(a.strategy)}</td>
                            <td className="px-4 py-2 text-xs text-slate-500 text-center">#{a.attempt_number}</td>
                            <td className="px-4 py-2">
                                <Badge variant={a.status === 'success' ? 'success' : a.status === 'failed' ? 'failed' : 'default'}>
                                    {capitalize(a.status)}
                                </Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-500 text-right font-mono">
                                {a.latency_ms != null ? `${a.latency_ms}ms` : '—'}
                            </td>
                            <td className="px-4 py-2">
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
// CredentialsPanel
// ─────────────────────────────────────────────────────────────────────────────

function CredentialsPanel({ credentials }) {
    if (!credentials?.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                <Shield size={28} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No provider credentials configured.</p>
                <p className="text-xs text-slate-400 mt-1">Contact your account manager to set up payment provider access.</p>
            </div>
        )
    }

    const statusColor = {
        active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
        pending:   'bg-amber-50 text-amber-700 border-amber-200',
        invalid:   'bg-red-50 text-red-600 border-red-200',
        inactive:  'bg-slate-100 text-slate-500 border-slate-200',
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {credentials.map((c, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{c.provider_name ?? capitalize(c.provider_alias)}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusColor[c.status] ?? statusColor.inactive}`}>
                            {capitalize(c.status)}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                        {c.display_name && <p>Label: <span className="text-slate-700">{c.display_name}</span></p>}
                        <p>Environment: <span className="font-medium text-slate-700">{capitalize(c.environment)}</span></p>
                        {c.public_key && (
                            <p>Public key: <span className="font-mono text-slate-600">{c.public_key}</span></p>
                        )}
                        <p>Secret: <span className="text-slate-500">{c.has_secret ? '••••••••' : 'Not set'}</span></p>
                        {c.last_validated_at && (
                            <p>Last validated: {fmt(c.last_validated_at)}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary strip
// ─────────────────────────────────────────────────────────────────────────────

function SummaryStrip({ summary }) {
    const cards = [
        {
            label: 'Live workflows',
            value: summary.published_workflows,
            icon: GitBranch,
            color: summary.published_workflows > 0 ? 'text-emerald-600' : 'text-slate-400',
        },
        {
            label: 'Unhealthy providers',
            value: summary.unhealthy_providers,
            icon: Shield,
            color: summary.unhealthy_providers > 0 ? 'text-red-500' : 'text-emerald-600',
        },
        {
            label: 'Failed attempts',
            value: summary.failed_attempts,
            icon: AlertTriangle,
            color: summary.failed_attempts > 0 ? 'text-amber-600' : 'text-slate-400',
        },
        {
            label: 'Total attempts',
            value: summary.total_attempts,
            icon: Activity,
            color: 'text-indigo-600',
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                    <Icon size={20} strokeWidth={1.75} className={`shrink-0 ${color}`} />
                    <div>
                        <p className="text-xl font-bold text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const TABS = ['Workflows', 'Provider Health', 'Activity', 'Credentials']

export default function RoutingIndex({ workflows, health, attempts, configurations, rules, credentials, trafficSplit, summary }) {
    const [tab, setTab] = useState('Workflows')

    const unhealthyCount = summary.unhealthy_providers

    return (
        <AuthenticatedLayout>
            <Head title="Routing" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                            <GitBranch size={20} strokeWidth={1.75} className="text-indigo-600" />
                            Routing
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                            <Lock size={12} strokeWidth={2} className="text-slate-400" />
                            Read-only view — routing is managed by your account administrator
                        </p>
                    </div>
                </div>

                {/* Summary strip */}
                <SummaryStrip summary={summary} />

                {/* Tab nav */}
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
                            {t === 'Provider Health' && unhealthyCount > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                    {unhealthyCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'Workflows' && (
                    <div className="space-y-6">
                        {/* Actual traffic distribution */}
                        <div className="space-y-2">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Traffic distribution</h2>
                            <TrafficSplitPanel trafficSplit={trafficSplit} />
                        </div>

                        {/* Routing configs */}
                        {configurations.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Routing configuration</h2>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {configurations.map((c, i) => <RoutingConfigCard key={i} config={c} />)}
                                </div>
                            </div>
                        )}

                        {/* Visual workflow cards */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Workflows</h2>
                            {workflows.length > 0 ? (
                                <div className="space-y-4">
                                    {workflows.map(w => <WorkflowCard key={w.id} workflow={w} />)}
                                </div>
                            ) : (
                                <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
                                    <GitBranch size={28} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-medium text-slate-600">No routing workflows configured</p>
                                    <p className="text-xs text-slate-400 mt-1">Your administrator will set up routing workflows for your account.</p>
                                </div>
                            )}
                        </div>

                        {/* Smart rules */}
                        {rules.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Smart routing rules</h2>
                                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">Rule</th>
                                                <th className="px-4 py-2 font-medium">Provider</th>
                                                <th className="px-4 py-2 font-medium">Environment</th>
                                                <th className="px-4 py-2 font-medium text-center">Priority</th>
                                                <th className="px-4 py-2 font-medium">Status</th>
                                                <th className="px-4 py-2 font-medium">Conditions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rules.map(r => (
                                                <tr key={r.id} className="border-b hover:bg-slate-50">
                                                    <td className="px-4 py-2 font-medium text-slate-700">{r.name}</td>
                                                    <td className="px-4 py-2"><ProviderPill alias={r.provider_alias} type="provider" /></td>
                                                    <td className="px-4 py-2 text-xs text-slate-500">{capitalize(r.environment)}</td>
                                                    <td className="px-4 py-2 text-xs text-center text-slate-500">{r.priority}</td>
                                                    <td className="px-4 py-2">
                                                        <Badge variant={r.enabled ? 'published' : 'default'}>{r.enabled ? 'Enabled' : 'Disabled'}</Badge>
                                                    </td>
                                                    <td className="px-4 py-2 text-xs text-slate-500">
                                                        {Object.keys(r.conditions ?? {}).length > 0
                                                            ? JSON.stringify(r.conditions)
                                                            : <span className="text-slate-300">—</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'Provider Health' && <ProviderHealthPanel health={health} />}

                {tab === 'Activity' && <ActivityFeed attempts={attempts} />}

                {tab === 'Credentials' && <CredentialsPanel credentials={credentials} />}
            </div>
        </AuthenticatedLayout>
    )
}
