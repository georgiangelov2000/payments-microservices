import { useEffect, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
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
    GitBranch, Activity, Shield, CheckCircle2, XCircle,
    AlertTriangle, Clock, ChevronDown, ChevronUp,
    ArrowRight, Zap, RefreshCw, Lock,
    Play, Scale,
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

function NodeShell({ children, cls }) {
    return <div className={`rounded-xl border-2 shadow-sm ${cls}`}>{children}</div>
}

function StartNode({ data }) {
    return (
        <NodeShell cls="min-w-[170px] border-indigo-700 bg-indigo-600 text-white">
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Play size={14} fill="currentColor" /></span>
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
    start: StartNode,
    provider: ProviderNode,
    condition: ConditionNode,
    weighted: WeightedNode,
    failover: FailoverNode,
    success: (props) => <TerminalNode {...props} type="success" />,
    failure: (props) => <TerminalNode {...props} type="failure" />,
}

function nodePayload(node) {
    return node.data || node
}

function layoutWorkflowNodes(rawNodes, rawEdges) {
    const nodes = rawNodes || []
    const edges = rawEdges || []

    if (!nodes.length) return []

    const ids = nodes.map((node, index) => String(node.id || `node-${index}`))
    const ranks = Object.fromEntries(ids.map((id) => [id, 0]))
    const byId = Object.fromEntries(nodes.map((node, index) => [String(node.id || `node-${index}`), node]))
    const incoming = Object.fromEntries(ids.map((id) => [id, 0]))

    edges.forEach((edge) => {
        if (edge.target && incoming[String(edge.target)] != null) {
            incoming[String(edge.target)] += 1
        }
    })

    nodes.forEach((node, index) => {
        const id = String(node.id || `node-${index}`)
        if (node.type === 'start' || incoming[id] === 0) {
            ranks[id] = 0
        }
    })

    for (let i = 0; i < nodes.length + 2; i += 1) {
        edges.forEach((edge) => {
            const source = String(edge.source || '')
            const target = String(edge.target || '')
            if (ranks[source] == null || ranks[target] == null) return
            ranks[target] = Math.max(ranks[target], ranks[source] + 1)
        })
    }

    const maxNonTerminalRank = Math.max(
        0,
        ...ids
            .filter((id) => !['success', 'failure'].includes(byId[id]?.type))
            .map((id) => ranks[id] || 0),
    )

    ids.forEach((id) => {
        if (['success', 'failure'].includes(byId[id]?.type)) {
            ranks[id] = Math.max(ranks[id] || 0, maxNonTerminalRank + 1)
        }
    })

    const rankGroups = ids.reduce((groups, id) => {
        const rank = ranks[id] || 0
        groups[rank] = groups[rank] || []
        groups[rank].push(id)
        return groups
    }, {})

    Object.values(rankGroups).forEach((group) => {
        group.sort((a, b) => {
            const aNode = byId[a]
            const bNode = byId[b]
            const aData = nodePayload(aNode)
            const bData = nodePayload(bNode)
            const terminalOrder = { success: 1, failure: 2 }

            return (terminalOrder[aNode.type] || 0) - (terminalOrder[bNode.type] || 0)
                || Number(aData.priority || 99) - Number(bData.priority || 99)
                || String(aData.label || aData.provider_alias || '').localeCompare(String(bData.label || bData.provider_alias || ''))
        })
    })

    const xGap = 310
    const yGap = 165
    const startX = 60
    const centerY = 190

    return nodes.map((node, index) => {
        const id = String(node.id || `node-${index}`)
        const rank = ranks[id] || 0
        const group = rankGroups[rank] || [id]
        const row = group.indexOf(id)
        const yOffset = (row - (group.length - 1) / 2) * yGap

        return {
            ...node,
            position: {
                x: startX + rank * xGap,
                y: Math.max(40, centerY + yOffset),
            },
        }
    })
}

function normalizeNodeForCanvas(node, index) {
    const data = node.data || node
    return {
        ...node,
        id: String(node.id || `node-${index}`),
        type: node.type || 'provider',
        position: node.position || { x: 80 + (index % 3) * 280, y: 70 + Math.floor(index / 3) * 190 },
        draggable: true,
        selectable: true,
        data: {
            ...data,
            label: data.label || data.provider_alias || node.type || 'Node',
        },
    }
}

function normalizeEdgeForCanvas(edge, index) {
    const label = edge.label || edge.condition || (edge.sourceHandle === 'failure' ? 'failed' : '')
    const isFailure = ['failure', 'failed', 'timeout', 'declined'].includes(String(label).toLowerCase()) || edge.sourceHandle === 'failure'
    const isSuccess = ['success', 'succeeded'].includes(String(label).toLowerCase()) || edge.sourceHandle === 'success'
    const color = isFailure ? '#f97316' : isSuccess ? '#10b981' : '#64748b'

    return {
        ...edge,
        id: String(edge.id || `edge-${index}`),
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

function WorkflowCanvas({ workflow, height = 'h-[560px]' }) {
    const initialNodes = layoutWorkflowNodes(workflow.nodes || [], workflow.edges || []).map(normalizeNodeForCanvas)
    const edges = (workflow.edges || []).map(normalizeEdgeForCanvas)
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)

    useEffect(() => {
        setNodes(initialNodes)
    }, [workflow.id])

    if (!initialNodes?.length) {
        return (
            <div className="flex h-72 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No workflow canvas configured yet.
            </div>
        )
    }

    return (
        <div className={`${height} overflow-hidden bg-slate-50`}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={FLOW_NODE_TYPES}
                fitView
                fitViewOptions={{ padding: 0.22 }}
                nodesDraggable
                nodesConnectable={false}
                onNodesChange={onNodesChange}
                edgesFocusable={false}
                edgesReconnectable={false}
                elementsSelectable
                panOnDrag
                zoomOnScroll
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#cbd5e1" gap={18} size={1} />
                <MiniMap pannable={false} zoomable={false} nodeStrokeWidth={3} className="!bg-white/90" />
                <Controls showInteractive={false} />
            </ReactFlow>
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
    const hasErrors = workflow.validation_errors?.length > 0
    const environmentClass = workflow.environment === 'live'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-indigo-200 bg-indigo-50 text-indigo-700'

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0 flex items-center gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-900">{workflow.name}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${workflow.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                                {workflow.status}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${environmentClass}`}>
                                {workflow.environment}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                v{workflow.current_version}
                            </span>
                        </div>
                        {workflow.published_at && (
                            <p className="mt-1 text-xs text-slate-400">Published {fmt(workflow.published_at)}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <Lock size={13} strokeWidth={2} />
                    Read-only
                </div>
            </div>

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

            <div className="flex min-h-[560px] overflow-hidden">
                <aside className="hidden w-48 shrink-0 border-r border-slate-200 bg-slate-50 p-3 lg:block">
                    <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Version</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">v{workflow.current_version}</p>
                    </div>
                    {workflow.versions?.length > 0 && (
                        <div>
                            <button
                                onClick={() => setShowVersions(v => !v)}
                                className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                            >
                                {showVersions ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                                History
                            </button>
                            {showVersions && (
                                <div className="space-y-1.5">
                                    {workflow.versions.slice(0, 6).map(v => (
                                        <div key={v.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-mono font-semibold text-slate-600">v{v.version}</span>
                                                <Badge variant={v.status ?? 'default'}>{capitalize(v.status ?? 'draft')}</Badge>
                                            </div>
                                            <p className="mt-1 truncate text-[10px] text-slate-400">{fmt(v.created_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </aside>
                <div className="min-w-0 flex-1">
                    <ReactFlowProvider>
                        <WorkflowCanvas workflow={workflow} height="h-[560px]" />
                    </ReactFlowProvider>
                </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-2 lg:hidden">
                <button
                    onClick={() => setShowVersions(v => !v)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                    {showVersions ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                    {workflow.versions?.length ?? 0} version{workflow.versions?.length !== 1 ? 's' : ''}
                </button>
                {showVersions && workflow.versions?.length > 0 && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {workflow.versions.map(v => (
                            <div key={v.id} className="rounded-lg border border-slate-100 px-3 py-2 text-xs text-slate-500">
                                <span className="font-mono text-slate-400">v{v.version}</span>
                                <span className="ml-2">{capitalize(v.status ?? 'draft')}</span>
                                <span className="ml-2">{fmt(v.created_at)}</span>
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

function TrafficSplitPanel({ trafficSplit, configurations }) {
    const [selectedEnvironment, setSelectedEnvironment] = useState(null)
    const environments = Array.from(new Set([
        ...(configurations || []).map((config) => config.environment),
        ...(trafficSplit || []).map((row) => row.environment),
    ])).sort((a, b) => (a === 'live' ? -1 : b === 'live' ? 1 : a.localeCompare(b)))

    const rows = environments.map((environment) => {
        const existing = (trafficSplit || []).find((row) => row.environment === environment)
        return existing || { environment, total: 0, providers: [] }
    })

    if (!rows.length) {
        return (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
                <Activity size={24} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No routing attempts recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Traffic data appears automatically once payments are processed.</p>
            </div>
        )
    }

    const activeEnvironment = selectedEnvironment || rows[0]?.environment || 'test'
    const selected = rows.find((row) => row.environment === activeEnvironment) || rows[0]
    const providers = selected?.providers || []
    const totalRequests = rows.reduce((s, r) => s + r.total, 0)
    const envLabel = capitalize(selected?.environment || 'test')
    const envBadgeClass = selected?.environment === 'live'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-indigo-200 bg-indigo-50 text-indigo-700'

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-700">Actual traffic distribution</h3>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${envBadgeClass}`}>
                        {envLabel} mode
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {rows.map((row) => (
                            <button
                                key={row.environment}
                                onClick={() => setSelectedEnvironment(row.environment)}
                                className={[
                                    'rounded-md px-3 py-1 text-xs font-semibold transition',
                                    activeEnvironment === row.environment
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700',
                                ].join(' ')}
                            >
                                {capitalize(row.environment)}
                                <span className="ml-1 text-slate-400">{row.total}</span>
                            </button>
                        ))}
                    </div>
                    <span className="text-xs text-slate-400">{totalRequests.toLocaleString()} all attempts</span>
                </div>
            </div>
            <div className="px-5 py-4 space-y-5">
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
                    Showing {envLabel.toLowerCase()} routing attempts only. Test and live traffic are separated because they use different operational environments.
                </div>
                {providers.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
                        <Activity size={22} strokeWidth={1} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No {envLabel.toLowerCase()} routing attempts yet.</p>
                    </div>
                )}
                {providers.map(r => {
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
            {providers.length > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                        {providers.map(r => (
                            <div
                                key={r.provider_alias}
                                className={`h-full transition-all ${PROVIDER_COLORS[r.provider_alias?.toLowerCase()] ?? 'bg-slate-400'}`}
                                style={{ width: `${r.pct}%` }}
                                title={`${capitalize(r.provider_alias)}: ${r.pct}%`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        {providers.map(r => (
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
