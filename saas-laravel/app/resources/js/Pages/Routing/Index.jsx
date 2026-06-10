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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Entry Point</p>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Provider</p>
                        <p className="text-sm font-bold leading-snug text-slate-800">{data.label || meta.label}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {data.enabled !== false
                        ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                        : <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Disabled</span>}
                    {Number(data.weight) > 0 && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{data.weight}%</span>}
                    {Number(data.priority) > 0 && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">P{data.priority}</span>}
                </div>
            </div>
            <div className="flex border-t border-slate-100">
                <div className="relative flex-1 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="success" className="opacity-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Success</span>
                </div>
                <div className="relative flex-1 border-l border-slate-100 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="failure" className="opacity-0" />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">Failure</span>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Condition</p>
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
                <div className="relative flex-1 py-1.5 text-center"><Handle type="source" position={Position.Bottom} id="yes" className="opacity-0" /><span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Yes</span></div>
                <div className="relative flex-1 border-l border-amber-200 py-1.5 text-center"><Handle type="source" position={Position.Bottom} id="no" className="opacity-0" /><span className="text-[9px] font-bold uppercase tracking-wide text-red-500">No</span></div>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Weighted Split</p>
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
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Failover Chain</p>
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
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${ok ? 'text-emerald-600' : 'text-red-600'}`}>Terminal</p>
                    <p className="text-sm font-bold text-slate-800">{data.label || (ok ? 'Payment Success' : 'Payment Failed')}</p>
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
    { type: 'start',     label: 'Start',     desc: 'Entry point',       cls: 'border-indigo-300 bg-indigo-50 text-indigo-700',  Icon: Play },
    { type: 'provider',  label: 'Provider',  desc: 'Route to provider', cls: 'border-slate-300 bg-white text-slate-700',         Icon: null },
    { type: 'condition', label: 'Condition', desc: 'IF / ELSE logic',   cls: 'border-amber-300 bg-amber-50 text-amber-700',      Icon: GitBranch },
    { type: 'weighted',  label: 'Weighted',  desc: 'Traffic split',     cls: 'border-purple-300 bg-purple-50 text-purple-700',   Icon: Scale },
    { type: 'failover',  label: 'Failover',  desc: 'Auto-failover',     cls: 'border-orange-300 bg-orange-50 text-orange-700',   Icon: Zap },
    { type: 'success',   label: 'Success',   desc: 'Success terminal',  cls: 'border-emerald-300 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
    { type: 'failure',   label: 'Failure',   desc: 'Failure terminal',  cls: 'border-red-300 bg-red-50 text-red-700',            Icon: XCircle },
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
                <p className="text-sm text-slate-400">Select a node to view its details</p>
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
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Label</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.label || '—'}</p>
            </div>

            {/* Provider-specific */}
            {node.type === 'provider' && (
                <>
                    {d.provider_alias && (
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Provider</p>
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <ProviderIcon alias={d.provider_alias} size="sm" className="ring-0 shadow-none" />
                                <span className="text-sm text-slate-700">{capitalize(d.provider_alias)}</span>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Priority</p>
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.priority ?? '—'}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Weight</p>
                            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{d.weight ? `${d.weight}%` : '—'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            {d.enabled !== false
                                ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Active</span>
                                : <span className="text-sm text-slate-500">Disabled</span>
                            }
                        </div>
                    </div>
                </>
            )}

            {/* Condition-specific */}
            {node.type === 'condition' && d.conditions?.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Conditions</p>
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
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribution</p>
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
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Failover chain</p>
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
                <Lock size={12} strokeWidth={2} />
                This workflow is managed by your administrator. Node properties are read-only.
            </div>
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
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                No workflow canvas configured yet.
            </div>
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
    const envLabel   = workflow.environment === 'live' ? 'Live' : 'Test'
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
                        <ArrowLeft size={15} strokeWidth={2} />
                        Routing
                    </button>
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
                        {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
                    </span>

                    {/* Reset to auto-layout */}
                    {hasSaved && !isDirty && (
                        <button
                            onClick={handleResetLayout}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                            title="Reset to automatic layout"
                        >
                            <RotateCcw size={12} strokeWidth={2} />
                            Reset layout
                        </button>
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
                        {saveState === 'saving' ? 'Saving…'
                            : saveState === 'saved' ? 'Layout saved'
                            : saveState === 'error' ? 'Save failed'
                            : 'Save layout'}
                    </button>

                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                        <Lock size={12} strokeWidth={2} />
                        Read-only
                    </div>
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
                            <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Types</p>
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
                                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Versions</p>
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
                                : 'Drag nodes to rearrange, then click Save layout.'}
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
                            {selectedNode ? 'Node details' : 'Inspector'}
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
    const versions    = workflow.versions ?? []
    const visibleVers = showAllVersions ? versions : versions.slice(0, 4)
    const isPublished = workflow.status === 'published'
    const envLabel    = workflow.environment === 'live' ? 'Live payments' : 'Test mode'
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
                            <LayoutGrid size={13} strokeWidth={2} />
                            Visual Builder
                        </Link>
                    ) : (
                        <span className="inline-flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white opacity-40">
                            <LayoutGrid size={13} strokeWidth={2} />
                            Visual Builder
                        </span>
                    )}
                </div>

                {/* Payment Flow */}
                {providers.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Flow</p>
                        <div className="flex flex-wrap items-center gap-2">
                            {providers.map((alias, i) => (
                                <div key={`${alias}-${i}`} className="flex items-center gap-2">
                                    {i > 0 && <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />}
                                    <ProviderPill alias={alias} />
                                </div>
                            ))}
                            <ArrowRight size={13} strokeWidth={2} className="text-slate-300" />
                            <span className="text-xs italic text-slate-400">Visual workflow</span>
                        </div>
                        {summary && <p className="text-sm text-slate-500">{summary}</p>}
                    </div>
                )}

                {/* Version history */}
                {versions.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">Version history:</span>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Status</p>
                    <p className={`mt-0.5 text-sm font-semibold ${allHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
                        {allHealthy
                            ? envHealth.length === 0 ? 'No activity recorded yet' : 'All processors running normally'
                            : `${unhealthy} processor${unhealthy > 1 ? 's' : ''} unhealthy`}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-2xl font-bold text-indigo-600">{liveRoutes}</span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Routes</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">
                        {liveRoutes === 0 ? 'No routes published yet' : `${liveRoutes} route${liveRoutes > 1 ? 's' : ''} actively routing`}
                    </p>
                </div>
            </div>
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${failedCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white shadow-sm'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${failedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{failedCount}</span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Failed Attempts</p>
                    <p className={`mt-0.5 text-sm font-semibold ${failedCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {failedCount > 0 ? `${failedCount} payment${failedCount > 1 ? 's' : ''} failed to route` : 'No failed attempts'}
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_TABS = ['Payment Routes', 'Processor Health', 'Recent Activity']

const ENV_TABS = [
    { key: 'test', label: 'Test', Icon: FlaskConical, activeCls: 'border-indigo-500 bg-indigo-50 text-indigo-700', dotCls: 'bg-indigo-400' },
    { key: 'live', label: 'Live', Icon: Globe,        activeCls: 'border-violet-500 bg-violet-50 text-violet-700', dotCls: 'bg-violet-400' },
]

export default function RoutingIndex({ workflows, health, attempts, summary }) {
    const [env, setEnv] = useState('test')
    const [tab, setTab] = useState('Payment Routes')

    const envWorkflows   = (workflows ?? []).filter(w => w.environment === env)
    const envHealth      = (health    ?? []).filter(h => h.environment === env)
    const envAttempts    = (attempts  ?? []).filter(a => a.environment === env)
    const unhealthyCount = envHealth.filter(h => h.status !== 'healthy').length

    return (
        <AuthenticatedLayout>
            <Head title="Routing" />
            <div className="p-6 max-w-7xl mx-auto space-y-6">

                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Payment Routing</h1>
                    <p className="mt-1 text-sm text-slate-500">Control how customer payments are distributed across your payment processors.</p>
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
                                        Active
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
                    {SECTION_TABS.map(t => (
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

                {tab === 'Payment Routes' && (
                    <div className="space-y-4">
                        {envWorkflows.length > 0 ? (
                            envWorkflows.map(w => <WorkflowCard key={w.id} workflow={w} />)
                        ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 py-14 text-center">
                                <GitBranch size={30} strokeWidth={1} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-600">
                                    No {env === 'live' ? 'live' : 'test'} routing workflows configured
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {env === 'live'
                                        ? 'Your administrator will publish a live workflow once testing is complete.'
                                        : 'Your administrator will set up routing workflows for your account.'}
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
