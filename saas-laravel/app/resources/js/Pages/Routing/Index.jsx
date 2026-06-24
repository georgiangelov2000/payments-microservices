
import i18n from '@/i18n';
import { useCallback, useEffect, useRef, useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
    ReactFlow, ReactFlowProvider,
    Background, Controls, MiniMap,
    Handle, Position, MarkerType,
    useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import Badge from '@/Components/Badge'
import { getProviderMeta, ProviderIcon } from '@/Components/ProviderBrand'
import {
    GitBranch, Activity, CheckCircle2, XCircle,
    AlertTriangle, ChevronDown, ChevronUp,
    ArrowRight, RefreshCw, Lock, LayoutGrid, X,
    Play, Scale, Zap, ArrowLeft, Save, RotateCcw,
    FlaskConical, Globe,
} from 'lucide-react'
import { fmtDate, timestampMillis } from '@/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fmt = fmtDate

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

// ─────────────────────────────────────────────────────────────────────────────
// ProviderPill (compact card view)
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
// routingTypeBadge — derive routing strategy from node composition
// ─────────────────────────────────────────────────────────────────────────────

function routingTypeBadge(nodes) {
    const all = nodes ?? []
    const has = (type) => all.some(n => n.type === type)
    const isVisual = has('start') || has('condition') || has('weighted') || has('failover')

    if (!isVisual) {
        const providers = all.filter(n => n.type === 'provider' && (n.data?.enabled ?? n.enabled) !== false)
        if (providers.length === 0) return null
        const hasWeights = providers.some(n => Number(n.data?.weight ?? n.weight ?? 0) > 0)
        return hasWeights
            ? { label: i18n.t('generated.routing_Index.weightedSplit'), cls: 'text-purple-700', Icon: Scale }
            : { label: i18n.t('generated.routing_Index.priorityFallback'), cls: 'text-orange-600', Icon: RefreshCw }
    }

    const hasCondition = has('condition')
    const hasWeighted  = has('weighted')
    const hasFailover  = has('failover')

    if (hasCondition && hasWeighted) return { label: i18n.t('generated.routing_Index.conditionalWeighted'), cls: 'text-amber-700', Icon: GitBranch }
    if (hasCondition) return { label: i18n.t('generated.routing_Index.conditionalRouting'), cls: 'text-amber-700', Icon: GitBranch }
    if (hasWeighted)  return { label: i18n.t('generated.routing_Index.weightedSplit'), cls: 'text-purple-700', Icon: Scale }
    if (hasFailover)  return { label: i18n.t('generated.routing_Index.failoverRouting'), cls: 'text-orange-600', Icon: RefreshCw }

    const providers = all.filter(n => n.type === 'provider')
    const hasWeightsInProviders = providers.some(n => Number(n.data?.weight ?? n.weight ?? 0) > 0)
    return hasWeightsInProviders
        ? { label: i18n.t('generated.routing_Index.weightedSplit'), cls: 'text-purple-700', Icon: Scale }
        : { label: i18n.t('generated.routing_Index.priorityFallback'), cls: 'text-orange-600', Icon: RefreshCw }
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
    return i18n.t('generated.common.visualWorkflowProcessors', { processors: aliases.join(', ') })
}

// ─────────────────────────────────────────────────────────────────────────────
// ReactFlow node components
// ─────────────────────────────────────────────────────────────────────────────

function NodeShell({ children, cls }) {
    return <div className={`rounded-xl border-2 shadow-sm ${cls}`}>{children}</div>
}

function StartNode({ data }) {
    return (
        <NodeShell cls="min-w-[170px] border-indigo-700 bg-indigo-600 text-white">
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                    <Play size={14} fill="currentColor" />
                </span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">{i18n.t('generated.routing_Index.entryPoint')}</p>
                    <p className="text-sm font-bold leading-snug">{data.label || 'Payment Request'}</p>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="output" className="opacity-0" />
        </NodeShell>
    )
}

function ProviderNode({ data }) {
    const meta = getProviderMeta(data.provider_alias, data.label)
    return (
        <NodeShell cls="min-w-[210px] border-slate-200 bg-white">
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2.5">
                    <ProviderIcon alias={data.provider_alias} label={data.label} size="md" className="ring-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.provider')}</p>
                        <p className="text-sm font-bold leading-snug text-slate-800">{data.label || meta.label}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {data.enabled !== false
                        ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                        : <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{i18n.t('generated.routing_Index.disabled')}</span>}
                    {Number(data.weight) > 0 && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{data.weight}%</span>}
                    {Number(data.priority) > 0 && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">P{data.priority}</span>}
                </div>
            </div>
            <div className="flex border-t border-slate-100">
                <div className="relative flex-1 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="success" className="opacity-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">{i18n.t('generated.routing_Index.success')}</span>
                </div>
                <div className="relative flex-1 border-l border-slate-100 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="failure" className="opacity-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">{i18n.t('generated.routing_Index.failure')}</span>
                </div>
            </div>
        </NodeShell>
    )
}

function ConditionNode({ data }) {
    const conds = data.conditions || []
    return (
        <NodeShell cls="min-w-[210px] border-amber-300 bg-amber-50">
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="px-4 py-3">
                <div className="mb-2 flex items-center gap-2">
                    <GitBranch size={18} className="shrink-0 text-amber-500" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">{i18n.t('generated.routing_Index.condition')}</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'IF / ELSE'}</p>
                    </div>
                </div>
                {conds.slice(0, 3).map((c, i) => (
                    <div key={i} className="mt-1 rounded border border-amber-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                        <span className="font-semibold text-amber-700">{c.field}</span> {c.operator} <span className="font-semibold">{Array.isArray(c.value) ? c.value.join(', ') : c.value}</span>
                    </div>
                ))}
            </div>
            <div className="flex border-t border-amber-200">
                <div className="relative flex-1 py-1.5 text-center"><Handle type="source" position={Position.Bottom} id="yes" className="opacity-0" /><span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">{i18n.t('generated.routing_Index.yes')}</span></div>
                <div className="relative flex-1 border-l border-amber-200 py-1.5 text-center"><Handle type="source" position={Position.Bottom} id="no" className="opacity-0" /><span className="text-[9px] font-bold uppercase tracking-wide text-red-500">{i18n.t('generated.routing_Index.no')}</span></div>
            </div>
        </NodeShell>
    )
}

function WeightedNode({ data }) {
    const dist = data.distribution || []
    return (
        <NodeShell cls="min-w-[210px] border-purple-300 bg-purple-50">
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                    <Scale size={16} className="shrink-0 text-purple-500" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600">{i18n.t('generated.routing_Index.weightedSplitdb5cb6')}</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'Traffic Split'}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {dist.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <ProviderIcon alias={d.provider_alias} size="xs" className="shadow-none ring-0" />
                            <span className="flex-1 text-[11px] text-slate-600">{getProviderMeta(d.provider_alias).label}</span>
                            <div className="h-1.5 w-16 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${d.weight}%` }} /></div>
                            <span className="w-8 text-right text-[11px] font-bold text-purple-700">{d.weight}%</span>
                        </div>
                    ))}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="output" className="opacity-0" />
        </NodeShell>
    )
}

function FailoverNode({ data }) {
    const chain = data.chain || []
    return (
        <NodeShell cls="min-w-[210px] border-orange-300 bg-orange-50">
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                    <Zap size={16} className="shrink-0 text-orange-500" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">{i18n.t('generated.routing_Index.failoverChain')}</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'Auto Failover'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {chain.map((alias, i) => (
                        <div key={`${alias}-${i}`} className="flex items-center gap-1">
                            {i > 0 && <span className="text-xs text-orange-400">→</span>}
                            <ProviderIcon alias={alias} size="xs" className="shadow-none ring-0" />
                        </div>
                    ))}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="output" className="opacity-0" />
        </NodeShell>
    )
}

function TerminalNode({ data, type }) {
    const ok = type === 'success'
    return (
        <NodeShell cls={`min-w-[170px] ${ok ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </span>
                <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${ok ? 'text-emerald-600' : 'text-red-600'}`}>{i18n.t('generated.routing_Index.terminal')}</p>
                    <p className="text-sm font-bold text-slate-800">{data.label || (ok ? i18n.t('generated.common.paymentSuccess') : i18n.t('generated.common.paymentFailed'))}</p>
                </div>
            </div>
        </NodeShell>
    )
}

const FLOW_NODE_TYPES = {
    start:    StartNode,
    provider: ProviderNode,
    condition: ConditionNode,
    weighted: WeightedNode,
    failover: FailoverNode,
    success:  (props) => <TerminalNode {...props} type="success" />,
    failure:  (props) => <TerminalNode {...props} type="failure" />,
}

// ─────────────────────────────────────────────────────────────────────────────
// Node types palette (left sidebar, visual only)
// ─────────────────────────────────────────────────────────────────────────────

const NODE_PALETTE = [
    { type: 'start',     label: i18n.t('generated.routing_Index.start'),     desc: i18n.t('generated.routing_Index.entryPoint82805c'),       cls: 'border-indigo-300 bg-indigo-50 text-indigo-700',  Icon: Play },
    { type: 'provider',  label: i18n.t('generated.routing_Index.provider'),  desc: i18n.t('generated.routing_Index.routeToProvider'), cls: 'border-slate-300 bg-white text-slate-700',         Icon: null },
    { type: 'condition', label: i18n.t('generated.routing_Index.condition'), desc: i18n.t('generated.routing_Index.ifElseLogic'),   cls: 'border-amber-300 bg-amber-50 text-amber-700',      Icon: GitBranch },
    { type: 'weighted',  label: i18n.t('generated.routing_Index.weighted'),  desc: i18n.t('generated.routing_Index.trafficSplit'),     cls: 'border-purple-300 bg-purple-50 text-purple-700',   Icon: Scale },
    { type: 'failover',  label: i18n.t('generated.routing_Index.failover'),  desc: i18n.t('generated.routing_Index.autoFailover'),     cls: 'border-orange-300 bg-orange-50 text-orange-700',   Icon: Zap },
    { type: 'success',   label: i18n.t('generated.routing_Index.success'),   desc: i18n.t('generated.routing_Index.successTerminal'),  cls: 'border-emerald-300 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
    { type: 'failure',   label: i18n.t('generated.routing_Index.failure'),   desc: i18n.t('generated.routing_Index.failureTerminal'),  cls: 'border-red-300 bg-red-50 text-red-700',            Icon: XCircle },
]

// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────

function layoutNodes(rawNodes, rawEdges) {
    const nodes = rawNodes || []
    const edges = rawEdges || []
    if (!nodes.length) return []

    const ids      = nodes.map((n, i) => String(n.id || `node-${i}`))
    const byId     = Object.fromEntries(nodes.map((n, i) => [String(n.id || `node-${i}`), n]))
    const ranks    = Object.fromEntries(ids.map(id => [id, 0]))
    const incoming = Object.fromEntries(ids.map(id => [id, 0]))

    edges.forEach(e => { if (e.target && incoming[String(e.target)] != null) incoming[String(e.target)] += 1 })
    nodes.forEach((n, i) => { const id = String(n.id || `node-${i}`); if (n.type === 'start' || incoming[id] === 0) ranks[id] = 0 })
    for (let i = 0; i < nodes.length + 2; i++) {
        edges.forEach(e => {
            const s = String(e.source || ''), t = String(e.target || '')
            if (ranks[s] != null && ranks[t] != null) ranks[t] = Math.max(ranks[t], ranks[s] + 1)
        })
    }

    const maxNT = Math.max(0, ...ids.filter(id => !['success', 'failure'].includes(byId[id]?.type)).map(id => ranks[id] || 0))
    ids.forEach(id => { if (['success', 'failure'].includes(byId[id]?.type)) ranks[id] = Math.max(ranks[id] || 0, maxNT + 1) })

    const groups = ids.reduce((g, id) => { const r = ranks[id] || 0; g[r] = g[r] || []; g[r].push(id); return g }, {})
    Object.values(groups).forEach(g => g.sort((a, b) => ({ success: 1, failure: 2 }[byId[a]?.type] || 0) - ({ success: 1, failure: 2 }[byId[b]?.type] || 0)))

    return nodes.map((n, i) => {
        const id = String(n.id || `node-${i}`)
        const rank = ranks[id] || 0
        const group = groups[rank] || [id]
        const row = group.indexOf(id)
        const yOff = (row - (group.length - 1) / 2) * 165
        return { ...n, position: { x: 60 + rank * 310, y: Math.max(40, 190 + yOff) } }
    })
}

function normalizeNode(node, i) {
    const data = node.data || node
    return {
        ...node,
        id: String(node.id || `node-${i}`),
        type: node.type || 'provider',
        position: node.position || { x: 80 + (i % 3) * 280, y: 70 + Math.floor(i / 3) * 190 },
        draggable: true,      // ← drag to reposition allowed
        selectable: true,     // ← click to inspect allowed
        data: { ...data, label: data.label || data.provider_alias || node.type || 'Node' },
    }
}

function normalizeEdge(edge, i) {
    const label = edge.label || edge.condition || (edge.sourceHandle === 'failure' ? 'failed' : '')
    const isFailure = ['failure', 'failed', 'timeout', 'declined'].includes(String(label).toLowerCase()) || edge.sourceHandle === 'failure'
    const isSuccess = ['success', 'succeeded'].includes(String(label).toLowerCase()) || edge.sourceHandle === 'success'
    const color = isFailure ? '#f97316' : isSuccess ? '#10b981' : '#64748b'
    return {
        ...edge,
        id: String(edge.id || `edge-${i}`),
        type: 'smoothstep',
        animated: false,
        selectable: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
        style: { stroke: color, strokeWidth: 2 },
        label,
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 6,
        labelStyle: { fill: '#475569', fontSize: 11, fontWeight: 600 },
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeInspector — read-only right panel
// ─────────────────────────────────────────────────────────────────────────────

function NodeInspector({ node }) {
    if (!node) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <LayoutGrid size={28} strokeWidth={1} className="text-slate-300" />
                <p className="text-sm text-slate-400">{i18n.t('generated.routing_Index.selectANodeToViewItsDetails')}</p>
            </div>
        )
    }

    const d = node.data || {}
    const typeLabel = NODE_PALETTE.find(p => p.type === node.type)

    return (
        <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4">
            {/* Node type badge */}
            <div className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${typeLabel?.cls ?? 'border-slate-200 bg-white text-slate-700'}`}>
                {typeLabel?.Icon && <typeLabel.Icon size={14} strokeWidth={2} />}
                {typeLabel?.label ?? capitalize(node.type)}
            </div>

            {/* Label */}
            <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.label')}</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.label || '—'}</p>
            </div>

            {/* Provider-specific */}
            {node.type === 'provider' && (
                <>
                    {d.provider_alias && (
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.provider')}</p>
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <ProviderIcon alias={d.provider_alias} size="sm" className="ring-0 shadow-none" />
                                <span className="text-sm text-slate-700">{capitalize(d.provider_alias)}</span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.priority')}</p>
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.priority ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.weight')}</p>
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.weight ? `${d.weight}%` : '—'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.status')}</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            {d.enabled !== false
                                ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active</span>
                                : <span className="text-sm text-slate-500">{i18n.t('generated.routing_Index.disabled')}</span>
                            }
                        </div>
                    </div>
                </>
            )}

            {/* Condition-specific */}
            {node.type === 'condition' && d.conditions?.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.conditions')}</p>
                    <div className="space-y-1.5">
                        {d.conditions.map((c, i) => (
                            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-600">
                                <span className="font-semibold text-amber-700">{c.field}</span>{' '}
                                <span className="text-slate-500">{c.operator}</span>{' '}
                                <span className="font-semibold">{Array.isArray(c.value) ? c.value.join(', ') : c.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weighted-specific */}
            {node.type === 'weighted' && d.distribution?.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.distribution')}</p>
                    <div className="space-y-2">
                        {d.distribution.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <ProviderIcon alias={item.provider_alias} size="xs" className="ring-0 shadow-none" />
                                <span className="flex-1 text-xs text-slate-600">{capitalize(item.provider_alias)}</span>
                                <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-purple-400" style={{ width: `${item.weight}%` }} />
                                </div>
                                <span className="text-xs font-bold text-purple-700 w-8 text-right">{item.weight}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Failover-specific */}
            {node.type === 'failover' && d.chain?.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.failoverChain9802dd')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {d.chain.map((alias, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                {i > 0 && <ArrowRight size={11} className="text-orange-400" />}
                                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1">
                                    <ProviderIcon alias={alias} size="xs" className="ring-0 shadow-none" />
                                    <span className="text-xs font-medium text-orange-700">{capitalize(alias)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Read-only notice */}
            <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                <Lock size={12} strokeWidth={2} />{i18n.t('generated.routing_Index.thisWorkflowIsManagedByYourAdministratorNode')}</div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// applyCanvasLayout — merge saved positions into auto-laid-out nodes
// ─────────────────────────────────────────────────────────────────────────────

function buildInitialNodes(workflow) {
    const auto   = layoutNodes(workflow.nodes || [], workflow.edges || []).map(normalizeNode)
    const saved  = workflow.canvas_layout ?? {}

    // If we have a saved position for this node, use it; otherwise keep auto
    return auto.map(n => saved[n.id]
        ? { ...n, position: { x: saved[n.id].x, y: saved[n.id].y } }
        : n
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReadOnlyCanvas
// ─────────────────────────────────────────────────────────────────────────────

function ReadOnlyCanvas({ workflow, onNodeSelect, onPositionsChange }) {
    const initialNodes = buildInitialNodes(workflow)
    const edges        = (workflow.edges || []).map(normalizeEdge)
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

    // Rebuild when workflow changes (e.g. different card opened)
    useEffect(() => { setNodes(buildInitialNodes(workflow)) }, [workflow.id])

    const onNodeClick = useCallback((_, node) => { onNodeSelect(node) }, [onNodeSelect])

    // Use `nodes` state (all nodes) — the third arg of onNodeDragStop is only the
    // dragged subset and would overwrite the saved layout with partial data.
    const onNodeDragStop = useCallback(() => {
        onPositionsChange(Object.fromEntries(nodes.map(n => [n.id, { x: n.position.x, y: n.position.y }])))
    }, [nodes, onPositionsChange])

    if (!initialNodes.length) {
        return (
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">{i18n.t('generated.routing_Index.noWorkflowCanvasConfiguredYet')}</div>
        )
    }

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={FLOW_NODE_TYPES}
            fitView={!(Object.keys(workflow.canvas_layout ?? {}).length > 0)}
            fitViewOptions={{ padding: 0.22 }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onNodeDragStop={onNodeDragStop}
            edgesFocusable={false}
            edgesReconnectable={false}
            panOnDrag
            zoomOnScroll
            proOptions={{ hideAttribution: true }}
        >
            <Background color="#cbd5e1" gap={18} size={1} />
            <MiniMap pannable zoomable={false} nodeStrokeWidth={3} className="!bg-white/90" />
            <Controls showInteractive={false} />
        </ReactFlow>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// VisualBuilderModal — full-screen, matches admin builder layout
// ─────────────────────────────────────────────────────────────────────────────

function VisualBuilderModal({ workflow, onClose }) {
    const [selectedNode, setSelectedNode]   = useState(null)
    const [isDirty,      setIsDirty]        = useState(false)
    const [saveState,    setSaveState]      = useState('idle') // idle | saving | saved | error
    const pendingPositions                  = useRef({})

    const nodeCount  = workflow.nodes?.length ?? 0
    const edgeCount  = workflow.edges?.length ?? 0
    const isPublished = workflow.status === 'published'
    const envLabel   = workflow.environment === 'live' ? i18n.t('generated.common.live') : i18n.t('generated.common.test')
    const hasSaved   = Object.keys(workflow.canvas_layout ?? {}).length > 0

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    const handlePositionsChange = useCallback((positions) => {
        pendingPositions.current = positions
        setIsDirty(true)
        setSaveState('idle')
    }, [])

    const handleSave = useCallback(() => {
        if (!isDirty || saveState === 'saving') return
        setSaveState('saving')
        router.put(
            route('routing.workflows.canvas-layout', workflow.id),
            { layout: pendingPositions.current },
            {
                preserveScroll: true,
                preserveState:  true,
                onSuccess: () => {
                    setSaveState('saved')
                    setIsDirty(false)
                    setTimeout(() => setSaveState('idle'), 2500)
                },
                onError: () => setSaveState('error'),
            }
        )
    }, [isDirty, saveState, workflow.id])

    const handleResetLayout = useCallback(() => {
        // Re-trigger a page reload so auto-layout runs fresh (canvas_layout will be empty after save)
        router.put(
            route('routing.workflows.canvas-layout', workflow.id),
            { layout: {} },
            {
                preserveScroll: true,
                preserveState:  false,
                onSuccess: () => onClose(),
            }
        )
    }, [workflow.id, onClose])

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">

            {/* ── Top bar ────────────────────────────────────────────────── */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
                {/* Left: back + title + badges */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={15} strokeWidth={2} />{i18n.t('common.nav.routing')}</button>
                    <span className="text-slate-300">|</span>
                    <span className="truncate text-sm font-semibold text-slate-800">{workflow.name}</span>

                    <span className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        isPublished ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}>
                        {isPublished && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {workflow.status?.toUpperCase()}
                    </span>
                    <span className={`hidden sm:inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                        workflow.environment === 'live'
                            ? 'border-violet-200 bg-violet-50 text-violet-700'
                            : 'border-slate-200 bg-slate-100 text-slate-500'
                    }`}>
                        {envLabel}
                    </span>
                </div>

                {/* Right: stats + save button + close */}
                <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-slate-400 sm:block mr-1">
                        {i18n.t('generated.common.nodesAndEdges', { nodes: nodeCount, edges: edgeCount })}
                    </span>

                    {/* Reset to auto-layout */}
                    {hasSaved && !isDirty && (
                        <button
                            onClick={handleResetLayout}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                            title={i18n.t('generated.routing_Index.resetToAutomaticLayout')}
                        >
                            <RotateCcw size={12} strokeWidth={2} />{i18n.t('generated.routing_Index.resetLayout')}</button>
                    )}

                    {/* Save Layout button */}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saveState === 'saving'}
                        className={[
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                            saveState === 'saved'
                                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                : saveState === 'error'
                                    ? 'border border-red-200 bg-red-50 text-red-600'
                                    : isDirty
                                        ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                                        : 'border border-slate-200 bg-slate-50 text-slate-400 cursor-default',
                        ].join(' ')}
                    >
                        <Save size={12} strokeWidth={2} />
                        {saveState === 'saving' ? i18n.t('generated.common.saving')
                            : saveState === 'saved' ? i18n.t('generated.common.layoutSaved')
                            : saveState === 'error' ? i18n.t('generated.common.saveFailed')
                            : i18n.t('generated.common.saveLayout')}
                    </button>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                        <Lock size={12} strokeWidth={2} />{i18n.t('generated.routing_Index.readOnly')}</div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {/* ── Body: sidebar + canvas + inspector ─────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left sidebar */}
                <aside className="hidden w-48 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
                    <div className="flex-1 overflow-y-auto p-3 space-y-5">
                        <div>
                            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.nodeTypes')}</p>
                            <div className="space-y-1.5">
                                {NODE_PALETTE.map(({ type, label, desc, cls, Icon }) => (
                                    <div key={type} className={`flex cursor-default items-center gap-2.5 rounded-lg border px-3 py-2.5 ${cls} opacity-75`}>
                                        {Icon ? <Icon size={14} strokeWidth={2} /> : <span className="h-3.5 w-3.5 rounded-full border border-current opacity-60" />}
                                        <div>
                                            <p className="text-xs font-semibold leading-none">{label}</p>
                                            <p className="mt-0.5 text-[10px] opacity-70">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {workflow.versions?.length > 0 && (
                            <div>
                                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.versions')}</p>
                                <div className="space-y-1.5">
                                    {workflow.versions.map(v => (
                                        <div key={v.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                                            v.version === workflow.current_version ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'
                                        }`}>
                                            <span className={`font-mono text-sm font-semibold ${v.version === workflow.current_version ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                v{v.version}
                                            </span>
                                            {v.status === 'published' && (
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">PUBLISHED</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Layout hint at sidebar bottom */}
                    <div className="border-t border-slate-100 p-3">
                        <p className="text-[10px] leading-relaxed text-slate-400">
                            {hasSaved
                                ? '✓ Custom layout saved. Drag nodes to rearrange.'
                                : i18n.t('generated.common.dragNodesSaveLayout')}
                        </p>
                    </div>
                </aside>

                {/* Canvas */}
                <div className="relative flex-1 overflow-hidden bg-slate-50">
                    <ReactFlowProvider>
                        <ReadOnlyCanvas
                            workflow={workflow}
                            onNodeSelect={setSelectedNode}
                            onPositionsChange={handlePositionsChange}
                        />
                    </ReactFlowProvider>
                </div>

                {/* Right inspector panel */}
                <aside className="hidden w-64 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
                    <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {selectedNode ? i18n.t('generated.common.nodeDetails') : i18n.t('generated.common.inspector')}
                        </p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <NodeInspector node={selectedNode} />
                    </div>
                </aside>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkflowCard
// ─────────────────────────────────────────────────────────────────────────────

function WorkflowCard({ workflow }) {
    const [showAllVersions, setShowAllVersions] = useState(false)

    const providers = (workflow.nodes ?? [])
        .filter(n => n.type === 'provider' && (n.data?.provider_alias || n.provider_alias))
        .sort((a, b) => (a.data?.priority ?? a.priority ?? 99) - (b.data?.priority ?? b.priority ?? 99))
        .map(n => n.data?.provider_alias ?? n.provider_alias)

    const summary     = buildFlowSummary(workflow.nodes)
    const typeBadge   = routingTypeBadge(workflow.nodes)
    const versions    = workflow.versions ?? []
    const visibleVers = showAllVersions ? versions : versions.slice(0, 4)
    const isPublished = workflow.status === 'published'
    const envLabel    = workflow.environment === 'live'
        ? <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />{i18n.t('generated.routing_Index.livePayments')}</span>
        : <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />{i18n.t('generated.routing_Index.testMode')}</span>
    const hasNodes    = (workflow.nodes?.length ?? 0) > 0

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                isPublished ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                                {isPublished && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                {capitalize(workflow.status)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            {envLabel}
                            {workflow.current_version && <span className="ml-2 font-mono text-slate-400">v{workflow.current_version}</span>}
                        </p>
                    </div>
                    {hasNodes ? (
                        <Link
                            href={route('routing.workflows.builder', workflow.id)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        >
                            <LayoutGrid size={13} strokeWidth={2} />{i18n.t('generated.routing_Index.visualBuilder')}</Link>
                    ) : (
                        <span className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white opacity-40">
                            <LayoutGrid size={13} strokeWidth={2} />{i18n.t('generated.routing_Index.visualBuilder')}</span>
                    )}
                </div>

                {/* Payment Flow */}
                {providers.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{i18n.t('generated.routing_Index.paymentFlow')}</p>
                        </div>
                        {typeBadge && (
                            <p className="text-xs text-slate-500">
                                <span className="font-medium text-slate-400">{i18n.t('generated.routing_Index.routingType')}</span>{' '}
                                <span className={`inline-flex items-center gap-1 font-semibold ${typeBadge.cls}`}>
                                    <typeBadge.Icon size={11} strokeWidth={2.5} />
                                    {typeBadge.label}
                                </span>
                            </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                            {providers.map((alias, i) => (
                                <div key={`${alias}-${i}`} className="flex items-center gap-2">
                                    {i > 0 && <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />}
                                    <ProviderPill alias={alias} />
                                </div>
                            ))}
                            <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />
                            <span className="text-xs italic text-slate-400">{i18n.t('generated.routing_Index.visualWorkflow')}</span>
                        </div>
                        {summary && <p className="text-sm text-slate-500">{summary}</p>}
                    </div>
                )}

                {/* Version history */}
                {versions.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">{i18n.t('generated.routing_Index.versionHistory')}</span>
                        {visibleVers.map(v => (
                            <span key={v.id} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                                v.status === 'published'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}>v{v.version}</span>
                        ))}
                        {versions.length > 4 && (
                            <button
                                onClick={() => setShowAllVersions(s => !s)}
                                className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showAllVersions
                                    ? <><ChevronUp size={11} strokeWidth={2} />{' '}{i18n.t('generated.routing_Index.less')}</>
                                    : <><ChevronDown size={11} strokeWidth={2} /> +{versions.length - 4}{' '}{i18n.t('generated.routing_Index.more')}</>
                                }
                            </button>
                        )}
                    </div>
                )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryStrip — scoped to the active environment
// ─────────────────────────────────────────────────────────────────────────────

function SummaryStrip({ workflows, health, attempts, env }) {
    const envWorkflows  = (workflows ?? []).filter(w => w.environment === env)
    const envHealth     = (health    ?? []).filter(h => h.environment === env)
    const envAttempts   = (attempts  ?? []).filter(a => a.environment === env)

    const allHealthy  = envHealth.length === 0 || envHealth.every(h => h.status === 'healthy')
    const liveRoutes  = envWorkflows.filter(w => w.status === 'published').length
    const failedCount = envAttempts.filter(a => a.status !== 'succeeded').length
    const unhealthy   = envHealth.filter(h => h.status !== 'healthy').length

    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${allHealthy ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${allHealthy ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {allHealthy ? <CheckCircle2 size={22} strokeWidth={1.75} /> : <AlertTriangle size={22} strokeWidth={1.75} />}
                </span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{i18n.t('generated.routing_Index.systemStatus')}</p>
                    <p className={`mt-0.5 text-sm font-semibold ${allHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
                        {allHealthy
                            ? envHealth.length === 0 ? i18n.t('generated.common.noActivityRecordedYet') : i18n.t('generated.common.allProcessorsRunningNormally')
                            : i18n.t('generated.common.processorsUnhealthy', { count: unhealthy })}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-2xl font-bold text-indigo-600">{liveRoutes}</span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{i18n.t('generated.routing_Index.activeRoutes')}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                        {liveRoutes === 0 ? i18n.t('generated.common.noRoutesPublishedYet') : i18n.t('generated.common.routesActivelyRouting', { count: liveRoutes })}
                    </p>
                </div>
            </div>
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${failedCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white shadow-sm'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${failedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{failedCount}</span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{i18n.t('generated.routing_Index.failedAttempts')}</p>
                    <p className={`mt-0.5 text-sm font-semibold ${failedCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {failedCount > 0 ? i18n.t('generated.common.paymentsFailedToRoute', { count: failedCount }) : i18n.t('generated.common.noFailedAttempts')}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_TABS = [
    { key: 'Payment Routes', label: i18n.t('generated.routing_Index.paymentRoutes') },
    { key: 'Processor Health', label: i18n.t('generated.routing_Index.processorHealth') },
    { key: 'Recent Activity', label: i18n.t('generated.routing_Index.recentActivity') },
]

const ENV_TABS = [
    { key: 'test', label: i18n.t('generated.common.test'), Icon: FlaskConical, activeCls: 'border-indigo-500 bg-indigo-50 text-indigo-700', dotCls: 'bg-indigo-400' },
    { key: 'live', label: i18n.t('generated.common.live'), Icon: Globe,        activeCls: 'border-violet-500 bg-violet-50 text-violet-700', dotCls: 'bg-violet-400' },
]

function humanizeAuditAction(action) {
    if (!action) return i18n.t('generated.common.unknownAction');
    const map = {
        'workflow.created':   i18n.t('generated.common.workflowCreated'),
        'workflow.updated':   i18n.t('generated.common.workflowUpdated'),
        'workflow.published': i18n.t('generated.common.workflowPublished'),
        'workflow.rollback':  i18n.t('generated.common.workflowRolledBack'),
    };
    return map[action] ?? action.replace(/[._]/g, ' ');
}

function ActivityFeed({ attempts, audits }) {
    const items = [
        ...(attempts ?? []).map((a) => ({
            id: `att-${a.id}`,
            type: 'attempt',
            time: a.created_at,
            ok: a.status === 'succeeded',
            paymentId: a.payment_id,
            text: a.status === 'succeeded'
                ? i18n.t('generated.common.paymentRouted', { provider: a.provider_alias, strategy: a.strategy, latency: a.latency_ms })
                : i18n.t('generated.common.routingFailed', { provider: a.provider_alias, error: a.error_code ?? a.status, latency: a.latency_ms }),
        })),
        ...(audits ?? []).map((a) => ({
            id: `aud-${a.id}`,
            type: 'audit',
            time: a.created_at,
            ok: null,
            text: i18n.t('generated.common.auditBy', { action: humanizeAuditAction(a.action), actor: a.actor_type }),
        })),
    ].sort((a, b) => (timestampMillis(b.time) ?? 0) - (timestampMillis(a.time) ?? 0)).slice(0, 10);

    if (!items.length) {
        return <p className="text-sm text-slate-400 py-4 text-center">{i18n.t('generated.routing_Index.noRecentActivity')}</p>;
    }

    return (
        <div className="space-y-0">
            {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.ok === null ? 'bg-slate-300' : item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">{item.text}</p>
                        {item.paymentId && (
                            <Link
                                href={route('payments.show', item.paymentId)}
                                title={item.paymentId}
                                className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100 hover:text-indigo-900"
                            >
                                <Activity size={11} strokeWidth={2} />
                                <span className="truncate">{i18n.t('generated.routing_Index.payment')}{' '}{shortPaymentId(item.paymentId)}</span>
                            </Link>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{fmt(item.time)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function shortPaymentId(id) {
    const value = String(id ?? '');

    if (value.length <= 18) return value;

    return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function ProviderHealthPanel({ health }) {
    if (!health?.length) {
        return (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
                <CheckCircle2 size={20} strokeWidth={2} className="shrink-0 text-green-500" />
                <p className="text-sm font-medium text-green-700">{i18n.t('generated.routing_Index.allPaymentProcessorsAreRunningNormallyNoIssues')}</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((row) => {
                const isUnhealthy = row.status === 'unhealthy';
                const isDegraded  = row.status === 'degraded';
                return (
                    <div key={row.id} className={`rounded-2xl border p-5 shadow-sm ${isUnhealthy ? 'border-red-200 bg-red-50' : isDegraded ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
                        <div className="flex items-center gap-3 mb-3">
                            <ProviderIcon alias={row.provider_alias} size="lg" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900 capitalize">{row.provider_alias}</p>
                                <p className="text-xs text-slate-500">{row.environment}</p>
                            </div>
                            <div className="ml-auto">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isUnhealthy ? 'border-red-300 bg-red-100 text-red-700' : isDegraded ? 'border-amber-300 bg-amber-100 text-amber-700' : 'border-green-300 bg-green-100 text-green-700'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isUnhealthy ? 'bg-red-500' : isDegraded ? 'bg-amber-500' : 'bg-green-500'}`} />
                                    {isUnhealthy ? i18n.t('generated.common.down') : isDegraded ? i18n.t('generated.common.degraded') : i18n.t('generated.common.healthy')}
                                </span>
                            </div>
                        </div>

                        {row.consecutive_failures > 0 && (
                            <p className="text-xs text-red-600 font-medium mb-1">
                                {i18n.t('generated.common.failedAttemptsInRow', { count: row.consecutive_failures })}</p>
                        )}
                        {row.disabled_until && (
                            <p className="text-xs text-amber-700">{i18n.t('generated.routing_Index.automaticallyPausedUntil')}{' '}{row.disabled_until}</p>
                        )}
                        {row.last_error && (
                            <p className="mt-2 text-xs text-slate-500 bg-white/70 rounded-lg px-2 py-1.5 border border-white truncate" title={row.last_error}>
                                {row.last_error}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function RoutingIndex({ workflows, health, attempts, summary }) {
    const [env, setEnv] = useState('test')
    const [tab, setTab] = useState('Payment Routes')

    const envWorkflows   = (workflows ?? []).filter(w => w.environment === env)
    const envHealth      = (health    ?? []).filter(h => h.environment === env)
    const envAttempts    = (attempts  ?? []).filter(a => a.environment === env)
    const unhealthyCount = envHealth.filter(h => h.status !== 'healthy').length

    return (
        <AuthenticatedLayout>
            <Head title={i18n.t('common.nav.routing')} />
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">{i18n.t('generated.routing_Index.paymentRouting')}</h1>
                    <p className="mt-1 text-sm text-slate-500">{i18n.t('generated.routing_Index.controlHowCustomerPaymentsAreDistributedAcrossYour')}</p>
                </div>

                {/* Environment switcher */}
                <div className="flex items-center gap-3">
                    {ENV_TABS.map(({ key, label, Icon, activeCls, dotCls }) => {
                        const isActive = env === key
                        return (
                            <button
                                key={key}
                                onClick={() => { setEnv(key); setTab('Payment Routes') }}
                                className={[
                                    'flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-semibold transition-all',
                                    isActive
                                        ? activeCls + ' shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                                ].join(' ')}
                            >
                                {isActive && <span className={`h-2 w-2 rounded-full ${dotCls}`} />}
                                <Icon size={15} strokeWidth={2} />
                                {label}
                                {isActive && (
                                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${key === 'test' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600'}`}>
                                        {i18n.t('generated.common.active')}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Stats scoped to this environment */}
                <SummaryStrip workflows={workflows} health={health} attempts={attempts} env={env} />

                {/* Section tabs */}
                <div className="flex gap-1 border-b border-slate-200">
                    {SECTION_TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={[
                                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                                tab === key
                                    ? 'text-indigo-600 after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-indigo-600'
                                    : 'text-slate-500 hover:text-slate-700',
                            ].join(' ')}
                        >
                            {label}
                            {key === 'Processor Health' && unhealthyCount > 0 && (
                                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                                    {unhealthyCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'Payment Routes' && (
                    <div className="space-y-4">
                        {envWorkflows.length > 0 ? (
                            envWorkflows.map(w => <WorkflowCard key={w.id} workflow={w} />)
                        ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
                                <GitBranch size={30} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-600">{i18n.t('generated.common.noRoutingWorkflowsConfigured', { environment: env === 'live' ? i18n.t('generated.common.live') : i18n.t('generated.common.test') })}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {env === 'live'
                                        ? i18n.t('generated.common.liveWorkflowPending')
                                        : i18n.t('generated.common.routingSetupPending')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'Processor Health' && <ProviderHealthPanel health={envHealth} />}
                {tab === 'Recent Activity'   && <ActivityFeed attempts={envAttempts} />}

            </div>
        </AuthenticatedLayout>
    )
}
