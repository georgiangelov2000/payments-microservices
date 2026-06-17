import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle, CheckCircle2, X, Plus, ChevronDown, GripVertical,
    Play, GitBranch, Scale, RefreshCcw, XCircle, LayoutGrid,
    Globe, ArrowRight, FlaskConical, CreditCard, Trash2, Save,
    Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Badge from '@/Components/Badge';
import { ProviderIcon } from '@/Components/ProviderBrand';
import AdminLayout from '@/Layouts/AdminLayout';
import { fmtDate, timestampMillis } from '@/utils';

// ─── Lightweight modal ────────────────────────────────────────────────────────

function Modal({ show, title, size = 'md', onClose, children }) {
    useEffect(() => {
        if (!show) return;
        const handler = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [show, onClose]);

    if (!show) return null;
    const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${widths[size] ?? widths.md} rounded-2xl bg-white shadow-2xl`}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X size={15} strokeWidth={2} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─── Status strip ─────────────────────────────────────────────────────────────

function StatusStrip({ summary, health }) {
    const unhealthy = Number(summary.unhealthyProviders ?? 0);
    const published = Number(summary.publishedWorkflows ?? 0);
    const failed    = Number(summary.failedAttempts ?? 0);

    return (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {/* System status */}
            <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${unhealthy > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${unhealthy > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {unhealthy > 0 ? <AlertTriangle size={22} strokeWidth={2} /> : <CheckCircle2 size={22} strokeWidth={2} />}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System Status</p>
                    <p className={`text-sm font-semibold mt-0.5 ${unhealthy > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {unhealthy > 0 ? `${unhealthy} processor${unhealthy > 1 ? 's' : ''} need attention` : 'All processors running normally'}
                    </p>
                </div>
            </div>

            {/* Active routes */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xl font-bold">
                    {published}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Payment Routes</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                        {published === 0 ? 'No routes are live yet' : `${published} route${published > 1 ? 's' : ''} actively routing payments`}
                    </p>
                </div>
            </div>

            {/* Failed attempts */}
            <div className={`flex items-center gap-4 rounded-2xl border p-5 shadow-sm ${failed > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${failed > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {failed}
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed Attempts</p>
                    <p className={`text-sm font-semibold mt-0.5 ${failed > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                        {failed === 0 ? 'No failed routing attempts' : `${failed} payment${failed > 1 ? 's' : ''} failed to route`}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Visual provider flow (e.g. Stripe 70% → PayPal 30%) ─────────────────────

// Normalize a node regardless of whether it came from the visual builder
// (React Flow format: node.data.*) or the simple editor (flat format: node.*).
function flatNode(n) {
    const d = n.data ?? {};
    return {
        id:             n.id,
        type:           n.type ?? 'provider',
        label:          d.label          ?? n.label          ?? n.type ?? '?',
        provider_alias: d.provider_alias ?? n.provider_alias ?? null,
        enabled:        d.enabled        ?? n.enabled        ?? true,
        weight:         Number(d.weight  ?? n.weight         ?? 0),
        priority:       Number(d.priority ?? n.priority      ?? 0),
        conditions:     d.conditions     ?? n.conditions     ?? [],
        distribution:   d.distribution   ?? n.distribution   ?? [],
        chain:          d.chain          ?? n.chain          ?? [],
    };
}

const NODE_TYPE_META = {
    start:     { Icon: Play,         cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    provider:  { Icon: null,         cls: 'bg-white border-slate-200 text-slate-800' },
    condition: { Icon: GitBranch,    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    weighted:  { Icon: Scale,        cls: 'bg-purple-50 border-purple-200 text-purple-700' },
    failover:  { Icon: RefreshCcw,   cls: 'bg-orange-50 border-orange-200 text-orange-700' },
    success:   { Icon: CheckCircle2, cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    failure:   { Icon: XCircle,      cls: 'bg-red-50 border-red-200 text-red-700' },
};

function ProviderFlow({ nodes, edges }) {
    const all = (nodes ?? []).map(flatNode);

    // Detect whether this is a visual-builder workflow (has start/condition/weighted nodes)
    const isVisualFlow = all.some(n => ['start', 'condition', 'weighted', 'failover', 'success', 'failure'].includes(n.type));

    if (all.length === 0) {
        return <span className="text-xs text-slate-400 italic">No processors configured yet</span>;
    }

    if (isVisualFlow) {
        // Show all non-trivial nodes in a compact pill row
        const display = all.filter(n => !['start', 'success', 'failure'].includes(n.type));
        if (display.length === 0) {
            return <span className="text-xs text-slate-400 italic">Open the Visual Builder to configure this route</span>;
        }
        return (
            <div className="flex flex-wrap items-center gap-2">
                {display.map((node) => {
                    const meta = NODE_TYPE_META[node.type] ?? NODE_TYPE_META.provider;
                    return (
                        <div key={node.id} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${meta.cls}`}>
                            {node.type === 'provider'
                                ? <ProviderIcon alias={node.provider_alias} size="sm" />
                                : meta.Icon && <meta.Icon size={12} strokeWidth={2} />}
                            <span>{node.label}</span>
                            {node.type === 'weighted' && node.distribution?.length > 0 && (
                                <span className="opacity-60">
                                    ({node.distribution.map(d => `${d.weight}% ${d.provider_alias}`).join(' / ')})
                                </span>
                            )}
                            {node.type === 'provider' && node.weight > 0 && (
                                <span className="font-semibold text-indigo-600">{node.weight}%</span>
                            )}
                        </div>
                    );
                })}
                <span className="text-[10px] text-slate-400 italic ml-1">Visual workflow</span>
            </div>
        );
    }

    // Legacy simple editor: just provider nodes sorted by priority
    const sorted     = all.filter(n => n.type === 'provider').sort((a, b) => a.priority - b.priority).filter(n => n.enabled);
    const hasWeights = sorted.some(n => n.weight > 0);

    return (
        <div className="flex flex-wrap items-center gap-2">
            {sorted.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <ProviderIcon alias={node.provider_alias} size="sm" />
                        <div>
                            <span className="text-sm font-medium text-slate-800">{node.label}</span>
                            {hasWeights && node.weight > 0
                                ? <span className="ml-1.5 text-xs font-semibold text-indigo-600">{node.weight}%</span>
                                : <span className="ml-1.5 text-xs text-slate-400">#{i + 1}</span>}
                        </div>
                    </div>
                    {i < sorted.length - 1 && (
                        <div className="flex flex-col items-center">
                            <ArrowRight size={14} strokeWidth={2} className="text-slate-300" />
                            {edges?.some(e => e.source === sorted[i].id && e.target === sorted[i + 1].id) && (
                                <span className="text-[10px] text-slate-400 -mt-0.5">fallback</span>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Route card ───────────────────────────────────────────────────────────────

function RouteCard({ workflow, onEdit }) {
    const isLive    = workflow.status === 'published';
    const isDraft   = workflow.status === 'draft';
    const nodes     = workflow.nodes ?? [];
    const edges     = workflow.edges ?? [];
    const hasErrors = (workflow.validation_errors ?? []).length > 0;
    const typeBadge = routingTypeBadge(nodes);

    return (
        <div className={`rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${isLive ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
            {/* Card header */}
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-slate-900 truncate">{workflow.name}</h3>
                        {isLive  && <span className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Live</span>}
                        {isDraft && <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">Draft — not live yet</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {workflow.merchant?.name}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {workflow.environment === 'live'
                            ? <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Live payments</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />Test mode</span>
                        }
                        <span className="mx-1.5 text-slate-300">·</span>
                        v{workflow.current_version}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href={route('admin.routing.workflows.builder', workflow.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                        <LayoutGrid size={14} strokeWidth={2} />
                        Visual Builder
                    </Link>
                    <button
                        onClick={() => onEdit(workflow)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                        Edit
                    </button>
                </div>
            </div>

            {/* Validation errors */}
            {hasErrors && (
                <div className="border-b border-red-100 bg-red-50 px-5 py-2.5">
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700"><AlertTriangle size={13} strokeWidth={2} /> This route has issues that need to be fixed before going live:</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {workflow.validation_errors.map((e, i) => <li key={i} className="text-xs text-red-600">{e}</li>)}
                    </ul>
                </div>
            )}

            {/* Provider flow */}
            <div className="px-5 py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Payment flow</p>
                {typeBadge && (
                    <p className="mb-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-400">Routing type:</span>{' '}
                        <span className={`inline-flex items-center gap-1 font-semibold ${typeBadge.cls.replace(/bg-\S+|border-\S+/g, '').trim()}`}>
                            <typeBadge.Icon size={11} strokeWidth={2.5} />
                            {typeBadge.label}
                        </span>
                    </p>
                )}
                <ProviderFlow nodes={nodes} edges={edges} />

                {/* Human-readable summary */}
                {nodes.length > 0 && (
                    <p className="mt-3 text-sm text-slate-500">
                        {buildFlowSummary(nodes, edges)}
                    </p>
                )}
            </div>

            {/* Version strip */}
            {workflow.versions?.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-2.5 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Version history:</span>
                    {workflow.versions.slice(0, 4).map((v) => (
                        <span key={v.id} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border font-medium ${v.status === 'published' ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                            v{v.version}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// Derive a routing-type label + style from node composition
function routingTypeBadge(nodes) {
    const all = (nodes ?? []).map(flatNode);
    const has = (type) => all.some(n => n.type === type);
    const isVisual = has('start') || has('condition') || has('weighted') || has('failover');

    if (!isVisual) {
        const providers = all.filter(n => n.type === 'provider').filter(n => n.enabled);
        if (providers.length === 0) return null;
        const hasWeights = providers.some(n => n.weight > 0);
        return hasWeights
            ? { label: 'Weighted split', cls: 'bg-purple-50 border-purple-200 text-purple-700', Icon: Scale }
            : { label: 'Priority fallback', cls: 'bg-orange-50 border-orange-200 text-orange-700', Icon: RefreshCcw };
    }

    const hasCondition = has('condition');
    const hasWeighted  = has('weighted');
    const hasFailover  = has('failover');

    if (hasCondition && hasWeighted) return { label: 'Conditional + weighted', cls: 'bg-amber-50 border-amber-200 text-amber-700', Icon: GitBranch };
    if (hasCondition) return { label: 'Conditional routing', cls: 'bg-amber-50 border-amber-200 text-amber-700', Icon: GitBranch };
    if (hasWeighted)  return { label: 'Weighted split', cls: 'bg-purple-50 border-purple-200 text-purple-700', Icon: Scale };
    if (hasFailover)  return { label: 'Failover routing', cls: 'bg-orange-50 border-orange-200 text-orange-700', Icon: RefreshCcw };
    // Visual builder with only provider nodes → priority fallback chain
    const providers = all.filter(n => n.type === 'provider');
    const hasWeightsInProviders = providers.some(n => n.weight > 0);
    return hasWeightsInProviders
        ? { label: 'Weighted split', cls: 'bg-purple-50 border-purple-200 text-purple-700', Icon: Scale }
        : { label: 'Priority fallback', cls: 'bg-orange-50 border-orange-200 text-orange-700', Icon: RefreshCcw };
}

// Build a plain-English summary of the routing flow
function buildFlowSummary(nodes, edges) {
    const all = (nodes ?? []).map(flatNode);

    // Visual-builder workflows: summarise by node types present
    const isVisual = all.some(n => ['start', 'condition', 'weighted', 'failover'].includes(n.type));
    if (isVisual) {
        const parts = [];
        const hasCondition = all.some(n => n.type === 'condition');
        const hasWeighted  = all.some(n => n.type === 'weighted');
        const hasFailover  = all.some(n => n.type === 'failover');
        const providers    = all.filter(n => n.type === 'provider').map(n => n.label);
        if (hasCondition) parts.push('conditional rules');
        if (hasWeighted)  parts.push('weighted traffic splitting');
        if (hasFailover)  parts.push('automatic failover');
        if (providers.length) parts.push(`processors: ${providers.join(', ')}`);
        return parts.length ? `Visual workflow with ${parts.join(', ')}.` : 'Visual routing workflow.';
    }

    // Simple editor: provider nodes only
    const sorted    = all.filter(n => n.type === 'provider').sort((a, b) => a.priority - b.priority).filter(n => n.enabled);
    const hasWeight = sorted.some(n => n.weight > 0);
    const names     = sorted.map(n => n.label);

    if (names.length === 0) return 'No processors configured.';

    if (hasWeight) {
        const parts  = sorted.filter(n => n.weight > 0).map(n => `${n.weight}% to ${n.label}`).join(', ');
        const backup = sorted.find(n => n.weight === 0);
        return `Payments are split: ${parts}.${backup ? ` If all fail, ${backup.label} is used as a last resort.` : ''}`;
    }

    if (names.length === 1) return `All payments go to ${names[0]}.`;

    const hasFailover = edges?.some(e => e.condition === 'failed' || e.condition === 'timeout');
    if (hasFailover) {
        return `Payments go to ${names[0]} first. If ${names[0]} is unavailable, they automatically switch to ${names.slice(1).join(', then ')}.`;
    }

    return `Payments attempt ${names.join(', then ')} in order.`;
}

// ─── Smart rules list (read-only display per route card) ─────────────────────

function SmartRulesList({ rules }) {
    if (!rules?.length) return null;

    return (
        <div className="mt-4 border-t border-slate-100 px-5 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Smart routing rules</p>
            <div className="space-y-1.5">
                {rules.map((rule) => (
                    <div key={rule.id} className="flex items-start gap-2">
                        <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-sm text-slate-600">
                            {humanizeRule(rule)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function humanizeRule(rule) {
    const cond = rule.conditions ?? {};
    const parts = [];
    if (cond.currency)       parts.push(`currency is ${cond.currency.toUpperCase()}`);
    if (cond.min_price)      parts.push(`price is over $${cond.min_price}`);
    if (cond.max_price)      parts.push(`price is under $${cond.max_price}`);
    if (cond.country)        parts.push(`country is ${cond.country.toUpperCase()}`);
    if (cond.payment_method) parts.push(`method is ${cond.payment_method}`);
    if (cond.recurring === true || cond.recurring === 'true') parts.push('payment is recurring');

    const provider = rule.provider_alias?.charAt(0).toUpperCase() + rule.provider_alias?.slice(1);
    const condition = parts.length ? `when ${parts.join(' and ')}` : 'always';
    return `Route to ${provider} ${condition} (priority ${rule.priority})`;
}

// ─── Route editor drawer ──────────────────────────────────────────────────────

function RouteEditorDrawer({ workflow, providers, merchants, merchantRules, onClose }) {
    const { t } = useTranslation();
    // Normalize nodes from both React Flow format and legacy flat format
    const [nodes, setNodes]       = useState((workflow?.nodes ?? []).map(flatNode));
    const [edges, setEdges]       = useState(workflow?.edges ?? []);
    const [mode, setMode]         = useState(() => {
        const hasWeights = (workflow?.nodes ?? []).some((n) => Number(n.weight) > 0);
        return hasWeights ? 'split' : 'order';
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [draggedId, setDraggedId]       = useState(null);

    useEffect(() => {
        setNodes((workflow?.nodes ?? []).map(flatNode));
        setEdges(workflow?.edges ?? []);
        const hasWeights = (workflow?.nodes ?? []).some((n) => Number(flatNode(n).weight) > 0);
        setMode(hasWeights ? 'split' : 'order');
    }, [workflow?.id, workflow?.updated_at]);

    // Which providers are available for this workflow's merchant
    const merchantObj      = merchants.find((m) => m.id === workflow?.merchant_id);
    const availableAliases = merchantObj?.providers?.length
        ? merchantObj.providers.map((p) => p.alias)
        : providers.map((p) => p.alias);

    const providerOptions = providers.filter((p) => availableAliases.includes(p.alias));

    const sortedNodes = [...nodes].sort((a, b) => a.priority - b.priority);
    const totalWeight = nodes.reduce((s, n) => s + Number(n.weight || 0), 0);

    // ── Node helpers ──

    const addProvider = (alias) => {
        const p = providers.find((x) => x.alias === alias);
        if (!p) return;
        if (nodes.some((n) => n.provider_alias === alias)) return; // already added
        const priority = nodes.length + 1;
        setNodes((cur) => [...cur, {
            id: `node-${Date.now()}`,
            type: 'provider',
            label: p.name || alias,
            provider_alias: alias,
            enabled: true,
            weight: 0,
            priority,
            conditions: {},
        }]);
    };

    const removeProvider = (id) => {
        setNodes((cur) => cur.filter((n) => n.id !== id).map((n, i) => ({ ...n, priority: i + 1 })));
        setEdges((cur) => cur.filter((e) => e.source !== id && e.target !== id));
    };

    const setWeight = (id, val) => {
        setNodes((cur) => cur.map((n) => n.id === id ? { ...n, weight: Number(val) } : n));
    };

    const toggleEnabled = (id) => {
        setNodes((cur) => cur.map((n) => n.id === id ? { ...n, enabled: !n.enabled } : n));
    };

    const reorderNode = (targetId) => {
        if (!draggedId || draggedId === targetId) return;
        setNodes((cur) => {
            const dragged  = cur.find((n) => n.id === draggedId);
            const without  = cur.filter((n) => n.id !== draggedId);
            const idx      = without.findIndex((n) => n.id === targetId);
            without.splice(idx, 0, dragged);
            return without.map((n, i) => ({ ...n, priority: i + 1 }));
        });
        setDraggedId(null);
    };

    // Auto-build failover edges from node order
    const buildAutoEdges = (nodeList) => {
        const sorted = [...nodeList].sort((a, b) => a.priority - b.priority);
        const result = [];
        for (let i = 0; i < sorted.length - 1; i++) {
            result.push({ id: `edge-auto-${i}`, source: sorted[i].id, target: sorted[i + 1].id, condition: 'failed' });
            result.push({ id: `edge-auto-timeout-${i}`, source: sorted[i].id, target: sorted[i + 1].id, condition: 'timeout' });
        }
        return result;
    };

    const toggleAutoFailover = (enabled) => {
        if (enabled) {
            setEdges(buildAutoEdges(nodes));
        } else {
            setEdges([]);
        }
    };

    const hasAutoFailover = edges.length > 0;

    // ── Save / Publish ──

    const save = () => {
        const finalNodes = nodes.map((n) => ({
            ...n,
            weight: mode === 'split' ? Number(n.weight) : 0,
        }));
        const finalEdges = mode === 'order' ? buildAutoEdges(finalNodes) : edges;

        router.put(route('admin.routing.workflows.update', workflow.id), {
            name: workflow.name,
            environment: workflow.environment,
            nodes: finalNodes,
            edges: finalEdges,
        }, { preserveScroll: true, onSuccess: onClose });
    };

    const publish = () => {
        const finalNodes = nodes.map((n) => ({
            ...n,
            weight: mode === 'split' ? Number(n.weight) : 0,
        }));
        const finalEdges = mode === 'order' ? buildAutoEdges(finalNodes) : edges;

        router.put(route('admin.routing.workflows.update', workflow.id), {
            name: workflow.name,
            environment: workflow.environment,
            nodes: finalNodes,
            edges: finalEdges,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                router.post(route('admin.routing.workflows.publish', workflow.id), {}, { preserveScroll: true, onSuccess: onClose });
            },
        });
    };

    const rollback = (version) => {
        router.post(route('admin.routing.workflows.rollback', [workflow.id, version.id]), {}, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const renameVersion = (version, name) => {
        router.put(route('admin.routing.workflows.versions.update', [workflow.id, version.id]), { name }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const deleteVersion = (version) => {
        if (!window.confirm(t('routing.versions.confirmDelete'))) return;

        router.delete(route('admin.routing.workflows.versions.destroy', [workflow.id, version.id]), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer panel */}
            <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl overflow-hidden">

                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">{workflow?.name}</h2>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm text-slate-500">{workflow?.merchant?.name}</span>
                            <span className="text-slate-300">·</span>
                            <Badge value={workflow?.environment} size="sm" />
                            <Badge value={workflow?.status} size="sm" />
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                        <X size={18} strokeWidth={2} />
                    </button>
                </div>

                {/* Drawer body — scrollable */}
                <div className="flex-1 overflow-y-auto">

                    {/* Section 1 — How should payments flow? */}
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">How should payments flow?</h3>
                        <p className="text-xs text-slate-500 mb-4">Choose whether payments go to one processor at a time, or get split across multiple processors simultaneously.</p>

                        {/* Mode toggle */}
                        <div className="mb-5 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('order')}
                                className={`rounded-xl border p-4 text-left transition-colors ${mode === 'order' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <ArrowRight size={18} strokeWidth={2.5} className="mb-1 text-indigo-500" />
                                <p className="text-sm font-semibold text-slate-900">Try in order</p>
                                <p className="text-xs text-slate-500 mt-0.5">Stripe first, PayPal as backup if Stripe fails</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('split')}
                                className={`rounded-xl border p-4 text-left transition-colors ${mode === 'split' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                            >
                                <Scale size={18} strokeWidth={2} className="mb-1 text-purple-500" />
                                <p className="text-sm font-semibold text-slate-900">Split traffic</p>
                                <p className="text-xs text-slate-500 mt-0.5">Send 70% to Stripe, 30% to PayPal at the same time</p>
                            </button>
                        </div>

                        {/* Add providers */}
                        <div className="mb-4">
                            <p className="text-xs font-medium text-slate-600 mb-2">Add payment processors to this route:</p>
                            <div className="flex flex-wrap gap-2">
                                {providerOptions.map((p) => {
                                    const already = nodes.some((n) => n.provider_alias === p.alias);
                                    return (
                                        <button
                                            key={p.alias}
                                            type="button"
                                            onClick={() => addProvider(p.alias)}
                                            disabled={already}
                                            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                                                already
                                                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                                                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                            }`}
                                        >
                                            <ProviderIcon alias={p.alias} size="sm" />
                                            {already
                                                ? <><CheckCircle2 size={13} strokeWidth={2} />{p.name}</>
                                                : <><Plus size={13} strokeWidth={2.5} />{p.name}</>
                                            }
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Processors list */}
                        {sortedNodes.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                                <p className="text-sm text-slate-400">No processors added yet.</p>
                                <p className="text-xs text-slate-400 mt-1">Use the buttons above to add payment processors.</p>
                            </div>
                        ) : mode === 'order' ? (
                            // Priority order list
                            <div className="space-y-2">
                                {sortedNodes.map((node, i) => (
                                    <div
                                        key={node.id}
                                        draggable
                                        onDragStart={() => setDraggedId(node.id)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => reorderNode(node.id)}
                                        className={`flex items-center gap-3 rounded-xl border bg-white p-3 cursor-move transition-opacity ${!node.enabled ? 'opacity-50' : ''}`}
                                    >
                                        {/* Drag handle */}
                                        <GripVertical size={16} strokeWidth={2} className="text-slate-300 shrink-0" />

                                        {/* Priority number */}
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                                            {i + 1}
                                        </span>

                                        <ProviderIcon alias={node.provider_alias} size="md" />

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">{node.label}</p>
                                            <p className="text-xs text-slate-500">{i === 0 ? 'Primary processor' : `Backup #${i} — used if the ${sortedNodes[0].label} fails`}</p>
                                        </div>

                                        {/* Enable toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleEnabled(node.id)}
                                            className={`text-xs font-medium px-2 py-1 rounded-lg border transition-colors ${node.enabled ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                                        >
                                            {node.enabled ? 'Active' : 'Paused'}
                                        </button>

                                        <button type="button" onClick={() => removeProvider(node.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                            <X size={15} strokeWidth={2} />
                                        </button>
                                    </div>
                                ))}

                                {/* Auto-failover toggle */}
                                {sortedNodes.length > 1 && (
                                    <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">Automatic failover</p>
                                            <p className="text-xs text-slate-500 mt-0.5">If a processor fails, automatically try the next one</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleAutoFailover(!hasAutoFailover)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasAutoFailover ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${hasAutoFailover ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Traffic split (weighted) mode
                            <div className="space-y-4">
                                {/* Weight validation */}
                                {totalWeight !== 100 && totalWeight > 0 && (
                                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                        <AlertTriangle size={13} strokeWidth={2} />
                                        Traffic split must total 100%. Currently: {totalWeight}%
                                    </div>
                                )}

                                {/* Visual bar */}
                                {sortedNodes.length > 0 && totalWeight > 0 && (
                                    <div className="overflow-hidden rounded-full h-3 bg-slate-100 flex">
                                        {sortedNodes.map((node, i) => {
                                            const colors = ['bg-indigo-500', 'bg-blue-400', 'bg-violet-400', 'bg-cyan-400'];
                                            return (
                                                <div
                                                    key={node.id}
                                                    className={`h-full transition-all ${colors[i % colors.length]}`}
                                                    style={{ width: `${Number(node.weight || 0)}%` }}
                                                    title={`${node.label}: ${node.weight}%`}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {sortedNodes.map((node) => (
                                    <div key={node.id} className="flex items-center gap-4">
                                        <ProviderIcon alias={node.provider_alias} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-slate-800">{node.label}</span>
                                                <span className="text-sm font-bold text-indigo-700 w-12 text-right">{node.weight ?? 0}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={node.weight ?? 0}
                                                onChange={(e) => setWeight(node.id, e.target.value)}
                                                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <button type="button" onClick={() => removeProvider(node.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                                            <X size={15} strokeWidth={2} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 2 — Advanced / Smart Rules */}
                    <div className="border-b border-slate-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="flex w-full items-center justify-between text-left"
                        >
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Smart routing rules</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {merchantRules?.length
                                        ? `${merchantRules.length} rule${merchantRules.length > 1 ? 's' : ''} active — click to view`
                                        : 'Optionally route specific payments differently'}
                                </p>
                            </div>
                            <ChevronDown
                                size={16}
                                strokeWidth={2}
                                className={`text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 space-y-2">
                                {merchantRules?.length > 0 ? (
                                    merchantRules.map((rule) => (
                                        <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-2.5">
                                                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                                                    <p className="text-sm text-slate-700">{humanizeRule(rule)}</p>
                                                </div>
                                                <span className="shrink-0 text-xs text-slate-400">Priority {rule.priority}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 text-center">
                                        <p className="text-sm text-slate-500">No smart rules yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">Smart rules let you route specific payments differently — for example, high-value orders always going through Stripe, or recurring payments going through PayPal.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3 — Version history */}
                    {workflow?.versions?.length > 0 && (
                        <div className="px-6 py-4">
                            <p className="text-sm font-semibold text-slate-900 mb-3">{t('routing.versions.history')}</p>
                            <div className="space-y-2">
                                {workflow.versions.map((v) => (
                                    <VersionHistoryRow
                                        key={v.id}
                                        version={v}
                                        currentVersion={workflow.current_version}
                                        onRename={renameVersion}
                                        onDelete={deleteVersion}
                                        onRollback={rollback}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Drawer footer — always visible */}
                <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    {totalWeight > 0 && totalWeight !== 100 && mode === 'split' && (
                        <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-700 font-medium"><AlertTriangle size={13} strokeWidth={2} /> Traffic split must total 100% before you can go live. Currently {totalWeight}%.</p>
                    )}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={save}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            {t('routing.versions.saveDraft')}
                        </button>
                        <button
                            type="button"
                            onClick={publish}
                            disabled={mode === 'split' && totalWeight !== 100}
                            className="inline-flex items-center justify-center gap-1.5 flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Globe size={15} strokeWidth={2} />
                            {t('routing.versions.makeLive')}
                        </button>
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-400">
                        {t('routing.versions.makeLiveHint')}
                    </p>
                </div>
            </div>
        </div>
    );
}

function VersionHistoryRow({ version, currentVersion, onRename, onDelete, onRollback }) {
    const { t } = useTranslation();
    const [name, setName] = useState(version.name || '');
    const displayName = version.name || t('routing.versions.version', { version: version.version });
    const isPublished = version.status === 'published';
    const isCurrent = version.version === currentVersion;
    const canDelete = !isPublished && !isCurrent;
    const canRestore = !isPublished;
    const nameChanged = name !== (version.name || '');

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge value={version.status} label={t(`common.badges.${version.status}`)} size="sm" />
                        <span className="text-sm font-semibold text-slate-800">{displayName}</span>
                        <span className="text-xs text-slate-400">v{version.version}</span>
                    </div>
                    {version.published_at && (
                        <p className="mt-1 text-xs text-slate-400">{t('routing.versions.publishedAt', { date: fmtDate(version.published_at) })}</p>
                    )}
                    {version.created_at && !version.published_at && (
                        <p className="mt-1 text-xs text-slate-400">{t('routing.versions.createdAt', { date: fmtDate(version.created_at) })}</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canRestore && (
                        <button
                            type="button"
                            onClick={() => onRollback(version)}
                            className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                            {t('routing.versions.restore')}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => onDelete(version)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                            <Trash2 size={12} strokeWidth={2} />
                            {t('routing.versions.delete')}
                        </button>
                    )}
                </div>
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('routing.versions.nameVersion', { version: version.version })}
                    className="min-w-0 flex-1 rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                    type="button"
                    disabled={!nameChanged}
                    onClick={() => onRename(version, name)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save size={12} strokeWidth={2} />
                    {t('common.actions.save')}
                </button>
            </div>
            {!canDelete && !isPublished && (
                <p className="mt-2 text-xs text-slate-400">{t('routing.versions.currentDraftDeleteForbidden')}</p>
            )}
        </div>
    );
}

// ─── Create route wizard (3-step modal) ───────────────────────────────────────

function CreateRouteWizard({ merchants, onClose }) {
    const form = useForm({ merchant_id: merchants[0]?.id || '', name: '', environment: 'test' });
    const [step, setStep] = useState(1);

    const next = () => setStep((s) => Math.min(s + 1, 3));
    const back = () => setStep((s) => Math.max(s - 1, 1));

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.routing.workflows.store'), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Modal show title={`New payment route — Step ${step} of 3`} size="md" onClose={onClose}>
            <form onSubmit={submit}>

                {/* Step indicator */}
                <div className="mb-6 flex items-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${s < step ? 'bg-green-500 text-white' : s === step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {s < step ? <CheckCircle2 size={14} strokeWidth={2.5} /> : s}
                            </div>
                            {s < 3 && <div className={`h-px flex-1 w-8 ${s < step ? 'bg-green-400' : 'bg-slate-200'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1 — Merchant */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-1">Who is this route for?</h4>
                            <p className="text-xs text-slate-500 mb-3">Choose the merchant account this payment route will apply to.</p>
                            <div className="space-y-2">
                                {merchants.map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => form.setData('merchant_id', m.id)}
                                        className={`w-full rounded-xl border p-3 text-left transition-colors ${form.data.merchant_id === m.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                                        <p className="text-xs text-slate-500">{m.email}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 — Name */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-1">Give this route a name</h4>
                            <p className="text-xs text-slate-500 mb-3">A descriptive name helps you identify the purpose of this route, e.g. "Default", "High Value Orders", "Europe".</p>
                            <input
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. Default payment route"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                    </div>
                )}

                {/* Step 3 — Environment */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-1">Is this for testing or real payments?</h4>
                            <p className="text-xs text-slate-500 mb-3">Start in test mode to try things out before going live with real customer payments.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => form.setData('environment', 'test')}
                                    className={`rounded-xl border p-4 text-left transition-colors ${form.data.environment === 'test' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <FlaskConical size={22} strokeWidth={1.75} className="mb-1.5 text-indigo-500" />
                                    <p className="text-sm font-semibold text-slate-900">Test mode</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Safe for experimenting — no real money involved</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => form.setData('environment', 'live')}
                                    className={`rounded-xl border p-4 text-left transition-colors ${form.data.environment === 'live' ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <CreditCard size={22} strokeWidth={1.75} className="mb-1.5 text-violet-500" />
                                    <p className="text-sm font-semibold text-slate-900">Live payments</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Real customer payments — use when ready</p>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer buttons */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <button type="button" onClick={step === 1 ? onClose : back} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>
                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={next}
                            disabled={step === 1 && !form.data.merchant_id || step === 2 && !form.data.name.trim()}
                            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            Continue →
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {form.processing ? 'Creating…' : 'Create route'}
                        </button>
                    )}
                </div>
            </form>
        </Modal>
    );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, merchants, onChange }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const debounceRef = useRef(null);

    const apply = (patch) => onChange({ ...filters, ...patch, page: 1 });

    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => apply({ search: val }), 350);
    };

    const active = (filters.search || filters.environment || filters.status || filters.merchant_id);

    return (
        <div className="mb-5 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
                <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by name or merchant…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                />
            </div>

            {/* Environment */}
            <select
                value={filters.environment ?? ''}
                onChange={e => apply({ environment: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
            >
                <option value="">All environments</option>
                <option value="test">Test mode</option>
                <option value="live">Live payments</option>
            </select>

            {/* Status */}
            <select
                value={filters.status ?? ''}
                onChange={e => apply({ status: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
            >
                <option value="">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
            </select>

            {/* Merchant */}
            <select
                value={filters.merchant_id ?? ''}
                onChange={e => apply({ merchant_id: e.target.value })}
                className="rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
            >
                <option value="">All merchants</option>
                {merchants.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>

            {/* Clear */}
            {active && (
                <button
                    onClick={() => { setSearch(''); onChange({}); }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    <X size={13} strokeWidth={2} />
                    Clear
                </button>
            )}
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;

    const { current_page, last_page, from, to, total } = meta;

    const pages = [];
    for (let p = Math.max(1, current_page - 2); p <= Math.min(last_page, current_page + 2); p++) {
        pages.push(p);
    }

    return (
        <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
                Showing {from}–{to} of <span className="font-semibold text-slate-700">{total}</span> workflows
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPage(current_page - 1)}
                    disabled={current_page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={14} strokeWidth={2} />
                </button>
                {pages[0] > 1 && (
                    <>
                        <button onClick={() => onPage(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">1</button>
                        {pages[0] > 2 && <span className="px-1 text-slate-400 text-sm">…</span>}
                    </>
                )}
                {pages.map(p => (
                    <button
                        key={p}
                        onClick={() => onPage(p)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                            p === current_page
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {p}
                    </button>
                ))}
                {pages[pages.length - 1] < last_page && (
                    <>
                        {pages[pages.length - 1] < last_page - 1 && <span className="px-1 text-slate-400 text-sm">…</span>}
                        <button onClick={() => onPage(last_page)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">{last_page}</button>
                    </>
                )}
                <button
                    onClick={() => onPage(current_page + 1)}
                    disabled={current_page === last_page}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight size={14} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}

// ─── Provider health panel ─────────────────────────────────────────────────────

function ProviderHealthPanel({ health }) {
    if (!health?.length) {
        return (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
                <CheckCircle2 size={20} strokeWidth={2} className="shrink-0 text-green-500" />
                <p className="text-sm font-medium text-green-700">All payment processors are running normally — no issues detected.</p>
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
                                <p className="text-xs text-slate-500">{row.merchant?.name ?? 'Global'} · {row.environment}</p>
                            </div>
                            <div className="ml-auto">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isUnhealthy ? 'border-red-300 bg-red-100 text-red-700' : isDegraded ? 'border-amber-300 bg-amber-100 text-amber-700' : 'border-green-300 bg-green-100 text-green-700'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${isUnhealthy ? 'bg-red-500' : isDegraded ? 'bg-amber-500' : 'bg-green-500'}`} />
                                    {isUnhealthy ? 'Down' : isDegraded ? 'Degraded' : 'Healthy'}
                                </span>
                            </div>
                        </div>

                        {row.consecutive_failures > 0 && (
                            <p className="text-xs text-red-600 font-medium mb-1">
                                {row.consecutive_failures} failed attempt{row.consecutive_failures > 1 ? 's' : ''} in a row
                            </p>
                        )}
                        {row.disabled_until && (
                            <p className="text-xs text-amber-700">Automatically paused until {row.disabled_until}</p>
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

// ─── Recent activity feed ─────────────────────────────────────────────────────

function ActivityFeed({ attempts, audits }) {
    const items = [
        ...(attempts ?? []).map((a) => ({
            id: `att-${a.id}`,
            type: 'attempt',
            time: a.created_at,
            ok: a.status === 'succeeded',
            paymentId: a.payment_id,
            text: a.status === 'succeeded'
                ? `Payment routed to ${a.provider_alias} via ${a.strategy} strategy in ${a.latency_ms}ms`
                : `Routing to ${a.provider_alias} failed (${a.error_code ?? a.status}) after ${a.latency_ms}ms`,
        })),
        ...(audits ?? []).map((a) => ({
            id: `aud-${a.id}`,
            type: 'audit',
            time: a.created_at,
            ok: null,
            text: `${humanizeAuditAction(a.action)} by ${a.actor_type}`,
        })),
    ].sort((a, b) => (timestampMillis(b.time) ?? 0) - (timestampMillis(a.time) ?? 0)).slice(0, 10);

    if (!items.length) {
        return <p className="text-sm text-slate-400 py-4 text-center">No recent activity.</p>;
    }

    return (
        <div className="space-y-0">
            {items.map((item, i) => (
                <div key={item.id} className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.ok === null ? 'bg-slate-300' : item.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700">{item.text}</p>
                        {item.paymentId && (
                            <Link
                                href={route('admin.payments.index', { search: item.paymentId })}
                                title={item.paymentId}
                                className="mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100 hover:text-indigo-900"
                            >
                                <CreditCard size={11} strokeWidth={2} />
                                <span className="truncate">Payment {shortPaymentId(item.paymentId)}</span>
                            </Link>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDate(item.time)}</p>
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

function humanizeAuditAction(action) {
    if (!action) return 'Unknown action';
    const map = {
        'workflow.created':   'Created a new payment route',
        'workflow.updated':   'Updated route configuration',
        'workflow.published': 'Published route — now live',
        'workflow.rollback':  'Rolled back to a previous version',
    };
    return map[action] ?? action.replace(/[._]/g, ' ');
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RoutingIndex({ summary, merchants, providers, workflows, filters: initialFilters, health, configurations, attempts, audits }) {
    const [editingWorkflow, setEditingWorkflow]   = useState(null);
    const [showCreateWizard, setShowCreateWizard] = useState(false);
    const [activeSection, setActiveSection]       = useState('routes'); // 'routes' | 'health' | 'activity'
    const [filters, setFilters]                   = useState(initialFilters ?? {});

    const workflowList = workflows?.data ?? [];
    const paginationMeta = workflows?.meta ?? null;

    const currentEditingWorkflow = useMemo(() => {
        if (!editingWorkflow) return null;
        return workflowList.find((workflow) => workflow.id === editingWorkflow.id) ?? editingWorkflow;
    }, [editingWorkflow, workflowList]);

    const applyFilters = (newFilters) => {
        setFilters(newFilters);
        router.get(route('admin.routing.index'), newFilters, { preserveState: true, preserveScroll: true, replace: true });
    };

    const goToPage = (page) => {
        applyFilters({ ...filters, page });
    };

    const rulesByMerchant = useMemo(() => ({}), []);

    const sections = [
        { key: 'routes',   label: 'Payment Routes' },
        { key: 'health',   label: 'Processor Health', badge: Number(summary.unhealthyProviders) > 0 ? summary.unhealthyProviders : null },
        { key: 'activity', label: 'Recent Activity' },
    ];

    return (
        <AdminLayout title="Payment Routing">
            <Head title="Payment Routing" />

            {/* Page title + create button */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Payment Routing</h1>
                    <p className="mt-0.5 text-sm text-slate-500">Control how customer payments are distributed across your payment processors.</p>
                </div>
                <button
                    onClick={() => setShowCreateWizard(true)}
                    className="shrink-0 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    New route
                </button>
            </div>

            {/* Status strip */}
            <StatusStrip summary={summary} health={health} />

            {/* Section nav */}
            <div className="mb-5 flex gap-1 border-b border-slate-200">
                {sections.map(({ key, label, badge }) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeSection === key
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {label}
                        {badge && (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                                {badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Payment Routes ── */}
            {activeSection === 'routes' && (
                <div>
                    <FilterBar filters={filters} merchants={merchants} onChange={applyFilters} />

                    <div className="space-y-4">
                        {workflowList.length === 0 ? (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-3xl">🛤</div>
                                {(filters.search || filters.environment || filters.status || filters.merchant_id) ? (
                                    <>
                                        <h3 className="text-base font-semibold text-slate-800">No routes match your filters</h3>
                                        <p className="mt-1 text-sm text-slate-500">Try adjusting your search or clearing the filters.</p>
                                        <button onClick={() => applyFilters({})} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                                            <X size={13} strokeWidth={2} /> Clear filters
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-base font-semibold text-slate-800">No payment routes yet</h3>
                                        <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">Create your first payment route to start controlling how customer payments are distributed across Stripe, PayPal, and other processors.</p>
                                        <button
                                            onClick={() => setShowCreateWizard(true)}
                                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                                        >
                                            Create your first route
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            workflowList.map((wf) => (
                                <RouteCard key={wf.id} workflow={wf} onEdit={setEditingWorkflow} />
                            ))
                        )}
                    </div>

                    <Pagination meta={paginationMeta} onPage={goToPage} />
                </div>
            )}

            {/* ── Processor Health ── */}
            {activeSection === 'health' && (
                <ProviderHealthPanel health={health} />
            )}

            {/* ── Recent Activity ── */}
            {activeSection === 'activity' && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-4">
                        <h2 className="text-sm font-semibold text-slate-900">Recent routing activity</h2>
                        <p className="text-xs text-slate-500 mt-0.5">A log of recent payment routing decisions and configuration changes.</p>
                    </div>
                    <div className="px-6 py-2">
                        <ActivityFeed attempts={attempts} audits={audits} />
                    </div>
                </div>
            )}

            {/* ── Route editor drawer ── */}
            {currentEditingWorkflow && (
                <RouteEditorDrawer
                    workflow={currentEditingWorkflow}
                    providers={providers}
                    merchants={merchants}
                    merchantRules={[]}
                    onClose={() => setEditingWorkflow(null)}
                />
            )}

            {/* ── Create route wizard ── */}
            {showCreateWizard && (
                <CreateRouteWizard
                    merchants={merchants}
                    onClose={() => setShowCreateWizard(false)}
                />
            )}
        </AdminLayout>
    );
}
