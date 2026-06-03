import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    ReactFlow, ReactFlowProvider,
    addEdge, Background, Controls, MiniMap,
    useNodesState, useEdgesState,
    Handle, Position, Panel,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AdminLayout from '@/Layouts/AdminLayout';
import toast from 'react-hot-toast';
import {
    Play, GitBranch, Scale, Zap, CheckCircle2, XCircle,
    Plus, AlertTriangle, FlaskConical,
} from 'lucide-react';

// ─── Provider metadata ────────────────────────────────────────────────────────

const PROVIDER_META = {
    stripe: { label: 'Stripe', color: '#6366f1', dot: 'bg-indigo-500', initials: 'S' },
    paypal: { label: 'PayPal', color: '#3b82f6', dot: 'bg-blue-500',   initials: 'P' },
    adyen:  { label: 'Adyen',  color: '#0abf53', dot: 'bg-emerald-500',initials: 'A' },
};
function pm(alias) {
    return PROVIDER_META[alias?.toLowerCase()] ?? {
        label: alias || 'Provider', color: '#64748b',
        dot: 'bg-slate-500', initials: (alias?.[0] ?? '?').toUpperCase(),
    };
}

// ─── Custom node components ───────────────────────────────────────────────────

function NodeShell({ selected, children, cls }) {
    return (
        <div className={`rounded-xl border-2 shadow-sm transition-shadow ${selected ? 'ring-2 ring-offset-1 ring-indigo-400 shadow-md' : ''} ${cls}`}>
            {children}
        </div>
    );
}

function StartNode({ data, selected }) {
    return (
        <NodeShell selected={selected} cls="bg-indigo-600 border-indigo-700 text-white min-w-[170px]">
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20"><Play size={14} strokeWidth={2} fill="currentColor" /></span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Entry Point</p>
                    <p className="text-sm font-bold leading-snug">{data.label || 'Payment Request'}</p>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="output"
                style={{ background: '#a5b4fc', width: 10, height: 10, border: '2px solid #fff' }} />
        </NodeShell>
    );
}

function ProviderNode({ data, selected }) {
    const meta = pm(data.provider_alias);
    return (
        <NodeShell selected={selected} cls="bg-white border-slate-200 min-w-[210px]" style={{ borderLeft: `4px solid ${meta.color}` }}>
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="px-4 py-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shrink-0 ${meta.dot}`}>
                        {meta.initials}
                    </span>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Provider</p>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{data.label || meta.label}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {data.enabled !== false
                        ? <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Active</span>
                        : <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Disabled</span>}
                    {data.weight > 0 && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{data.weight}%</span>}
                    {data.priority > 0 && <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">P{data.priority}</span>}
                </div>
            </div>
            <div className="flex border-t border-slate-100">
                <div className="relative flex-1 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="success"
                        style={{ left: '33%', background: '#10b981', width: 10, height: 10, border: '2px solid #fff' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Success</span>
                </div>
                <div className="relative flex-1 border-l border-slate-100 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="failure"
                        style={{ left: '67%', background: '#ef4444', width: 10, height: 10, border: '2px solid #fff' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">Failure</span>
                </div>
            </div>
        </NodeShell>
    );
}

function ConditionNode({ data, selected }) {
    const conds = data.conditions || [];
    return (
        <NodeShell selected={selected} cls="bg-amber-50 border-amber-300 min-w-[210px]">
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                    <GitBranch size={18} strokeWidth={2} className="text-amber-500 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Condition</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'IF / ELSE'}</p>
                    </div>
                </div>
                {conds.length > 0 && (
                    <div className="space-y-1">
                        {conds.slice(0, 3).map((c, i) => (
                            <div key={i} className="rounded border border-amber-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                <span className="font-semibold text-amber-700">{c.field}</span>
                                {' '}{c.operator}{' '}
                                <span className="font-semibold">{Array.isArray(c.value) ? c.value.join(', ') : c.value}</span>
                            </div>
                        ))}
                        {conds.length > 3 && <p className="text-[10px] text-amber-500">+{conds.length - 3} more conditions</p>}
                    </div>
                )}
            </div>
            <div className="flex border-t border-amber-200">
                <div className="relative flex-1 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="yes"
                        style={{ left: '33%', background: '#10b981', width: 10, height: 10, border: '2px solid #fff' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">Yes</span>
                </div>
                <div className="relative flex-1 border-l border-amber-200 py-1.5 text-center">
                    <Handle type="source" position={Position.Bottom} id="no"
                        style={{ left: '67%', background: '#ef4444', width: 10, height: 10, border: '2px solid #fff' }} />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-red-500">No</span>
                </div>
            </div>
        </NodeShell>
    );
}

function WeightedNode({ data, selected }) {
    const dist  = data.distribution || [];
    const total = dist.reduce((s, d) => s + (d.weight || 0), 0);
    return (
        <NodeShell selected={selected} cls="bg-purple-50 border-purple-300 min-w-[210px]">
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2.5">
                    <Scale size={16} strokeWidth={2} className="text-purple-500 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Weighted Split</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'Traffic Split'}</p>
                    </div>
                </div>
                <div className="space-y-2">
                    {dist.map((d, i) => {
                        const m = pm(d.provider_alias);
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${m.dot}`} />
                                <span className="flex-1 text-[11px] text-slate-600">{m.label}</span>
                                <div className="h-1.5 w-16 rounded-full bg-slate-200">
                                    <div className="h-1.5 rounded-full bg-purple-400 transition-all" style={{ width: `${d.weight}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-purple-700 w-8 text-right">{d.weight}%</span>
                            </div>
                        );
                    })}
                    {total !== 100 && dist.length > 0 && (
                        <p className="flex items-center gap-1 text-[10px] font-semibold text-red-500"><AlertTriangle size={10} strokeWidth={2} /> Total {total}% — must equal 100%</p>
                    )}
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} id="output"
                style={{ background: '#a78bfa', width: 10, height: 10, border: '2px solid #fff' }} />
        </NodeShell>
    );
}

function FailoverNode({ data, selected }) {
    const chain = data.chain || [];
    return (
        <NodeShell selected={selected} cls="bg-orange-50 border-orange-300 min-w-[210px]">
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2.5">
                    <Zap size={16} strokeWidth={2} className="text-orange-500 shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Failover Chain</p>
                        <p className="text-sm font-bold text-slate-800">{data.label || 'Auto Failover'}</p>
                    </div>
                </div>
                {chain.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                        {chain.map((alias, i) => {
                            const m = pm(alias);
                            return (
                                <div key={i} className="flex items-center gap-1">
                                    {i > 0 && <span className="text-orange-400 text-xs">→</span>}
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${m.dot}`}>
                                        {m.initials}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            <Handle type="source" position={Position.Bottom} id="output"
                style={{ background: '#fb923c', width: 10, height: 10, border: '2px solid #fff' }} />
        </NodeShell>
    );
}

function SuccessNode({ data, selected }) {
    return (
        <NodeShell selected={selected} cls="bg-emerald-50 border-emerald-300 min-w-[170px]">
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={18} strokeWidth={2} /></span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Terminal</p>
                    <p className="text-sm font-bold text-slate-800">{data.label || 'Payment Success'}</p>
                </div>
            </div>
        </NodeShell>
    );
}

function FailureNode({ data, selected }) {
    return (
        <NodeShell selected={selected} cls="bg-red-50 border-red-300 min-w-[170px]">
            <Handle type="target" position={Position.Top}
                style={{ background: '#cbd5e1', width: 10, height: 10, border: '2px solid #fff' }} />
            <div className="flex items-center gap-2.5 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><XCircle size={18} strokeWidth={2} /></span>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-600">Terminal</p>
                    <p className="text-sm font-bold text-slate-800">{data.label || 'Payment Failed'}</p>
                </div>
            </div>
        </NodeShell>
    );
}

const NODE_TYPES = { start: StartNode, provider: ProviderNode, condition: ConditionNode, weighted: WeightedNode, failover: FailoverNode, success: SuccessNode, failure: FailureNode };

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
    { type: 'start',     Icon: Play,          label: 'Start',     desc: 'Entry point',    cls: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
    { type: 'provider',  Icon: Plus,           label: 'Provider',  desc: 'Route to provider', cls: 'bg-white border-slate-300 text-slate-700' },
    { type: 'condition', Icon: GitBranch,      label: 'Condition', desc: 'IF / ELSE logic', cls: 'bg-amber-50 border-amber-300 text-amber-700' },
    { type: 'weighted',  Icon: Scale,          label: 'Weighted',  desc: 'Traffic split',  cls: 'bg-purple-50 border-purple-300 text-purple-700' },
    { type: 'failover',  Icon: Zap,            label: 'Failover',  desc: 'Auto-failover',  cls: 'bg-orange-50 border-orange-300 text-orange-700' },
    { type: 'success',   Icon: CheckCircle2,   label: 'Success',   desc: 'Success terminal', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
    { type: 'failure',   Icon: XCircle,        label: 'Failure',   desc: 'Failure terminal', cls: 'bg-red-50 border-red-300 text-red-700' },
];

function NodePalette() {
    const onDragStart = (e, type) => {
        e.dataTransfer.setData('application/reactflow', type);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="flex flex-col gap-1.5 w-44 shrink-0">
            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Node Types</p>
            {PALETTE.map(item => (
                <div
                    key={item.type}
                    draggable
                    onDragStart={e => onDragStart(e, item.type)}
                    className={`flex cursor-grab items-center gap-2.5 rounded-lg border px-3 py-2 active:cursor-grabbing select-none ${item.cls}`}
                >
                    {item.Icon && <item.Icon size={15} strokeWidth={2} className="shrink-0" />}
                    <div>
                        <p className="text-xs font-semibold leading-tight">{item.label}</p>
                        <p className="text-[10px] opacity-70 leading-tight">{item.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ node, providers, onUpdate, onDelete }) {
    if (!node) {
        return (
            <div className="flex w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <span className="text-3xl">🖱</span>
                <p className="text-xs text-slate-400 font-medium">Select a node to configure it</p>
            </div>
        );
    }

    const d = node.data;
    const set = (key, val) => onUpdate(node.id, { ...d, [key]: val });

    return (
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 capitalize">{node.type} Node</p>
                <button onClick={() => onDelete(node.id)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Delete node">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-col gap-4 p-4">
                {/* Label — all node types */}
                <Field label="Label">
                    <input value={d.label || ''} onChange={e => set('label', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100" />
                </Field>

                {/* Provider-specific */}
                {node.type === 'provider' && (
                    <>
                        <Field label="Provider">
                            <select value={d.provider_alias || ''} onChange={e => set('provider_alias', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none">
                                <option value="">Select provider…</option>
                                {providers.map(p => <option key={p.alias} value={p.alias}>{p.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Priority">
                            <input type="number" min="1" value={d.priority || 1} onChange={e => set('priority', parseInt(e.target.value) || 1)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none" />
                        </Field>
                        <Field label="Weight (%)">
                            <input type="number" min="0" max="100" value={d.weight || 0} onChange={e => set('weight', parseInt(e.target.value) || 0)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none" />
                        </Field>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-500">Enabled</span>
                            <Toggle checked={d.enabled !== false} onChange={v => set('enabled', v)} />
                        </div>
                    </>
                )}

                {/* Condition-specific */}
                {node.type === 'condition' && (
                    <ConditionEditor conditions={d.conditions || []} onChange={v => set('conditions', v)} />
                )}

                {/* Weighted-specific */}
                {node.type === 'weighted' && (
                    <WeightedEditor distribution={d.distribution || []} providers={providers} onChange={v => set('distribution', v)} />
                )}

                {/* Failover-specific */}
                {node.type === 'failover' && (
                    <FailoverEditor chain={d.chain || []} providers={providers} onChange={v => set('chain', v)} />
                )}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
            {children}
        </div>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <button onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-slate-200'}`}>
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
    );
}

const OPERATORS = [
    { value: 'eq',  label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'in',  label: 'in' },
    { value: 'gt',  label: '>' },
    { value: 'lt',  label: '<' },
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
];
const COND_FIELDS = ['country', 'currency', 'payment_method', 'card_type', 'recurring', 'amount', 'environment'];

function ConditionEditor({ conditions, onChange }) {
    const add = () => onChange([...conditions, { field: 'country', operator: 'eq', value: '' }]);
    const remove = i => onChange(conditions.filter((_, idx) => idx !== i));
    const update = (i, key, val) => onChange(conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c));

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conditions (AND)</span>
                <button onClick={add} className="rounded px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50">+ Add</button>
            </div>
            <div className="space-y-2">
                {conditions.map((c, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                        <div className="flex gap-1.5">
                            <select value={c.field} onChange={e => update(i, 'field', e.target.value)}
                                className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none">
                                {COND_FIELDS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select value={c.operator} onChange={e => update(i, 'operator', e.target.value)}
                                className="w-12 rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none">
                                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-1.5">
                            <input value={Array.isArray(c.value) ? c.value.join(', ') : c.value}
                                onChange={e => {
                                    const v = e.target.value;
                                    update(i, 'value', c.operator === 'in' ? v.split(',').map(s => s.trim()) : v);
                                }}
                                placeholder={c.operator === 'in' ? 'US, DE, FR' : 'value'}
                                className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none" />
                            <button onClick={() => remove(i)} className="rounded p-0.5 text-slate-300 hover:text-red-500 transition-colors"><XCircle size={14} strokeWidth={2} /></button>
                        </div>
                    </div>
                ))}
                {conditions.length === 0 && (
                    <p className="text-[11px] text-slate-400 text-center py-2">No conditions — always matches</p>
                )}
            </div>
        </div>
    );
}

function WeightedEditor({ distribution, providers, onChange }) {
    const add = () => {
        const used = distribution.map(d => d.provider_alias);
        const next = providers.find(p => !used.includes(p.alias));
        if (next) onChange([...distribution, { provider_alias: next.alias, weight: 0 }]);
    };
    const remove = i => onChange(distribution.filter((_, idx) => idx !== i));
    const update = (i, key, val) => onChange(distribution.map((d, idx) => idx === i ? { ...d, [key]: val } : d));
    const total = distribution.reduce((s, d) => s + (d.weight || 0), 0);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribution</span>
                <button onClick={add} className="rounded px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50">+ Add</button>
            </div>
            <div className="space-y-1.5">
                {distribution.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <select value={d.provider_alias || ''} onChange={e => update(i, 'provider_alias', e.target.value)}
                            className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none">
                            <option value="">Provider…</option>
                            {providers.map(p => <option key={p.alias} value={p.alias}>{p.name}</option>)}
                        </select>
                        <input type="number" min="0" max="100" value={d.weight || 0}
                            onChange={e => update(i, 'weight', parseInt(e.target.value) || 0)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none" />
                        <span className="text-xs text-slate-400">%</span>
                        <button onClick={() => remove(i)} className="rounded p-0.5 text-slate-300 hover:text-red-500 transition-colors"><XCircle size={14} strokeWidth={2} /></button>
                    </div>
                ))}
            </div>
            <div className={`mt-2 text-[11px] font-semibold ${total === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
                Total: {total}% {total === 100 ? <CheckCircle2 size={13} strokeWidth={2} className="inline text-emerald-500" /> : '(must be 100%)'}
            </div>
        </div>
    );
}

function FailoverEditor({ chain, providers, onChange }) {
    const add = () => {
        const next = providers.find(p => !chain.includes(p.alias));
        if (next) onChange([...chain, next.alias]);
    };
    const remove = i => onChange(chain.filter((_, idx) => idx !== i));
    const update = (i, val) => onChange(chain.map((c, idx) => idx === i ? val : c));

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Failover Order</span>
                <button onClick={add} className="rounded px-2 py-0.5 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50">+ Add</button>
            </div>
            <div className="space-y-1.5">
                {chain.map((alias, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                        <select value={alias} onChange={e => update(i, e.target.value)}
                            className="flex-1 rounded border border-slate-200 px-1.5 py-1 text-xs focus:outline-none">
                            {providers.map(p => <option key={p.alias} value={p.alias}>{p.name}</option>)}
                        </select>
                        <button onClick={() => remove(i)} className="rounded p-0.5 text-slate-300 hover:text-red-500 transition-colors"><XCircle size={14} strokeWidth={2} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Simulation panel ─────────────────────────────────────────────────────────

function clientSimulate(nodes, edges, input) {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
    const adj = {};
    edges.forEach(e => { adj[e.source] = adj[e.source] || []; adj[e.source].push({ target: e.target, handle: e.sourceHandle }); });

    const start = nodes.find(n => n.type === 'start');
    if (!start) return { outcome: 'error', path: [], error: 'No start node' };

    const path = [];
    let current = start;
    let steps = 0;

    while (current && steps++ < 30) {
        const { id, type, data = {} } = current;
        const outgoing = adj[id] || [];
        const step = { id, type, label: data.label || type, decision: null };

        if (type === 'success') { step.decision = '✓ Payment routed successfully'; path.push(step); break; }
        if (type === 'failure') { step.decision = '✕ Payment routing failed'; path.push(step); break; }

        if (type === 'provider') {
            step.decision = `→ Route to ${data.provider_alias || 'unknown'}`;
            step.provider = data.provider_alias;
            path.push(step);
            const e = outgoing.find(e => e.handle === 'success') || outgoing[0];
            current = e ? nodeMap[e.target] : null;
            continue;
        }
        if (type === 'condition') {
            const match = (data.conditions || []).every(c => {
                const actual = String(input[c.field] ?? '').toLowerCase();
                const exp = Array.isArray(c.value) ? c.value.map(v => v.toLowerCase()) : [String(c.value).toLowerCase()];
                if (c.operator === 'eq')  return actual === exp[0];
                if (c.operator === 'neq') return actual !== exp[0];
                if (c.operator === 'in')  return exp.includes(actual);
                if (c.operator === 'gt')  return parseFloat(input[c.field]) > parseFloat(c.value);
                if (c.operator === 'lt')  return parseFloat(input[c.field]) < parseFloat(c.value);
                if (c.operator === 'gte') return parseFloat(input[c.field]) >= parseFloat(c.value);
                if (c.operator === 'lte') return parseFloat(input[c.field]) <= parseFloat(c.value);
                return true;
            });
            const handle = match ? 'yes' : 'no';
            step.decision = match ? '✓ Condition matched → yes' : '✗ No match → no';
            path.push(step);
            const e = outgoing.find(e => e.handle === handle) || outgoing[0];
            current = e ? nodeMap[e.target] : null;
            continue;
        }
        if (type === 'weighted') {
            const dist = data.distribution || [];
            const token = String(input.amount || '') + String(input.country || '');
            let hash = 0; for (const c of token) hash = ((hash << 5) - hash) + c.charCodeAt(0);
            const bucket = Math.abs(hash) % 100;
            let cursor = 0, chosen = dist[0]?.provider_alias || 'unknown';
            for (const d of dist) { cursor += d.weight || 0; if (bucket < cursor) { chosen = d.provider_alias; break; } }
            step.decision = `→ Weighted: ${chosen}`;
            step.provider = chosen;
            path.push(step);
            current = outgoing[0] ? nodeMap[outgoing[0].target] : null;
            continue;
        }
        if (type === 'failover') {
            const p = (data.chain || [])[0] || 'unknown';
            step.decision = `→ Failover primary: ${p}`;
            step.provider = p;
            path.push(step);
            current = outgoing[0] ? nodeMap[outgoing[0].target] : null;
            continue;
        }
        path.push(step);
        current = outgoing[0] ? nodeMap[outgoing[0].target] : null;
    }

    return { outcome: (path[path.length - 1]?.type) || 'incomplete', path };
}

function SimulationPanel({ nodes, edges }) {
    const [open, setOpen]     = useState(false);
    const [input, setInput]   = useState({ country: 'US', currency: 'USD', amount: '99', payment_method: 'card', recurring: false });
    const [result, setResult] = useState(null);

    const run = () => setResult(clientSimulate(nodes, edges, input));

    const typeColor = t => ({ success: 'border-emerald-400 bg-emerald-50 text-emerald-700', failure: 'border-red-400 bg-red-50 text-red-700', provider: 'border-indigo-200 bg-indigo-50 text-indigo-700', condition: 'border-amber-200 bg-amber-50 text-amber-700', weighted: 'border-purple-200 bg-purple-50 text-purple-700', failover: 'border-orange-200 bg-orange-50 text-orange-700', start: 'border-indigo-200 bg-indigo-50 text-indigo-700' }[t] || 'border-slate-200 bg-slate-50 text-slate-600');

    return (
        <div className="border-t border-slate-200 bg-white">
            <button onClick={() => setOpen(o => !o)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <FlaskConical size={15} strokeWidth={2} className="shrink-0" /> Simulation
                <span className="ml-auto text-slate-400">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="border-t border-slate-100 px-4 py-3">
                    <div className="flex flex-wrap items-end gap-3">
                        {[
                            { key: 'country', label: 'Country', placeholder: 'US, DE…' },
                            { key: 'currency', label: 'Currency', placeholder: 'USD' },
                            { key: 'amount',   label: 'Amount',   placeholder: '99.99' },
                            { key: 'payment_method', label: 'Method', placeholder: 'card' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{f.label}</label>
                                <input value={input[f.key]} onChange={e => setInput(s => ({ ...s, [f.key]: e.target.value }))}
                                    placeholder={f.placeholder}
                                    className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-400 focus:outline-none" />
                            </div>
                        ))}
                        <div className="flex items-center gap-2 pb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recurring</span>
                            <Toggle checked={input.recurring} onChange={v => setInput(s => ({ ...s, recurring: v }))} />
                        </div>
                        <button onClick={run}
                            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                            <Play size={11} strokeWidth={2} fill="currentColor" className="inline mr-1" />Run
                        </button>
                    </div>

                    {result && (
                        <div className="mt-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                {result.path.map((step, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        {i > 0 && <span className="text-slate-300 text-xs">→</span>}
                                        <div className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-xs ${typeColor(step.type)}`}>
                                            <span className="font-semibold">{step.label}</span>
                                            {step.decision && <span className="text-[10px] opacity-80 mt-0.5">{step.decision}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {result.error && <p className="mt-2 text-xs text-red-500">{result.error}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Default edge style ───────────────────────────────────────────────────────

function edgeStyle(sourceHandle) {
    if (sourceHandle === 'success' || sourceHandle === 'yes') return { stroke: '#10b981', strokeWidth: 2 };
    if (sourceHandle === 'failure' || sourceHandle === 'no')  return { stroke: '#ef4444', strokeWidth: 2 };
    if (sourceHandle === 'output') return { stroke: '#94a3b8', strokeWidth: 2 };
    return { stroke: '#94a3b8', strokeWidth: 1.5 };
}

function edgeLabel(sourceHandle) {
    if (sourceHandle === 'success') return 'success';
    if (sourceHandle === 'failure') return 'failure';
    if (sourceHandle === 'yes')     return 'yes';
    if (sourceHandle === 'no')      return 'no';
    return null;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

// Ensure every node has a valid position and data wrapper before React Flow touches it.
// Handles both the React Flow format (already correct) and the legacy flat format.
function normalizeForCanvas(rawNodes) {
    return (rawNodes || []).map((n, i) => {
        const hasPosition = n.position && typeof n.position.x === 'number';
        const hasData     = n.data && typeof n.data === 'object';
        // Legacy flat node — lift fields into data wrapper and assign a grid position
        if (!hasPosition || !hasData) {
            return {
                id:       n.id ?? `node-${i}`,
                type:     n.type ?? 'provider',
                position: hasPosition ? n.position : { x: (i % 3) * 260 + 80, y: Math.floor(i / 3) * 210 + 80 },
                data: hasData ? n.data : {
                    label:          n.label          ?? n.type ?? 'Node',
                    provider_alias: n.provider_alias ?? null,
                    enabled:        n.enabled        ?? true,
                    weight:         Number(n.weight  ?? 0),
                    priority:       Number(n.priority ?? i + 1),
                    conditions:     n.conditions     ?? [],
                    distribution:   n.distribution   ?? [],
                    chain:          n.chain          ?? [],
                },
            };
        }
        return n;
    });
}

function WorkflowBuilder({ workflow, providers, merchantProviders }) {
    const [rfInstance, setRfInstance]   = useState(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(normalizeForCanvas(workflow.nodes));
    const [edges, setEdges, onEdgesChange] = useEdgesState(workflow.edges || []);
    const [selectedNode, setSelectedNode]  = useState(null);
    const [saving, setSaving]              = useState(false);
    const [name, setName]                  = useState(workflow.name);
    const dropRef                          = useRef(null);

    const allProviders = useMemo(() => {
        const seen = new Set();
        return [...(merchantProviders || []), ...(providers || [])].filter(p => {
            if (seen.has(p.alias)) return false;
            seen.add(p.alias); return true;
        });
    }, [providers, merchantProviders]);

    // Keep selectedNode in sync when nodes array changes
    useEffect(() => {
        if (!selectedNode) return;
        const found = nodes.find(n => n.id === selectedNode.id);
        if (found) setSelectedNode(found);
    }, [nodes]);

    const onConnect = useCallback((params) => {
        const style = edgeStyle(params.sourceHandle);
        const label = edgeLabel(params.sourceHandle);
        setEdges(prev => addEdge({
            ...params, style, label,
            markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 14, height: 14 },
            type: 'smoothstep',
        }, prev));
    }, [setEdges]);

    const onDragOver = useCallback(e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

    const onDrop = useCallback(e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/reactflow');
        if (!type || !rfInstance) return;

        const pos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const count = nodes.filter(n => n.type === type).length + 1;
        const defaults = {
            start:     { label: 'Payment Request' },
            provider:  { label: `Provider ${count}`, provider_alias: null, enabled: true, weight: 0, priority: count, conditions: [] },
            condition: { label: `Condition ${count}`, conditions: [] },
            weighted:  { label: `Traffic Split ${count}`, distribution: [] },
            failover:  { label: `Failover ${count}`, chain: [] },
            success:   { label: 'Payment Success' },
            failure:   { label: 'Payment Failed' },
        };
        setNodes(prev => [...prev, { id: `${type}-${Date.now()}`, type, position: pos, data: defaults[type] || { label: type } }]);
    }, [rfInstance, nodes, setNodes]);

    const onNodeClick = useCallback((_, node) => setSelectedNode(node), []);
    const onPaneClick = useCallback(() => setSelectedNode(null), []);

    const updateNodeData = useCallback((id, data) => {
        setNodes(prev => prev.map(n => n.id === id ? { ...n, data } : n));
    }, [setNodes]);

    const deleteNode = useCallback((id) => {
        setNodes(prev => prev.filter(n => n.id !== id));
        setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
        setSelectedNode(null);
    }, [setNodes, setEdges]);

    const save = () => {
        setSaving(true);
        router.put(route('admin.routing.workflows.update', workflow.id), { name, environment: workflow.environment, nodes, edges }, {
            preserveScroll: true,
            onSuccess: () => { toast.success('Workflow saved'); setSaving(false); },
            onError: () => { toast.error('Save failed'); setSaving(false); },
        });
    };

    const publish = () => {
        router.post(route('admin.routing.workflows.publish', workflow.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success('Workflow published — routing configuration updated'),
            onError: (e) => toast.error(Object.values(e)[0] || 'Validation failed'),
        });
    };

    const statusColor = {
        draft:     'bg-blue-100 text-blue-700',
        published: 'bg-green-100 text-green-700',
    }[workflow.status] ?? 'bg-slate-100 text-slate-600';

    return (
        <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
            {/* Top bar */}
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                <a href={route('admin.routing.index')}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
                    ← Routing
                </a>
                <div className="h-4 w-px bg-slate-200" />
                <input value={name} onChange={e => setName(e.target.value)}
                    className="rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-100 transition-colors" />
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusColor}`}>
                    {workflow.status}
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                    {workflow.environment}
                </span>
                {workflow.merchant && (
                    <span className="text-xs text-slate-400">{workflow.merchant.name}</span>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} edge{edges.length !== 1 ? 's' : ''}</span>
                    <button onClick={save} disabled={saving}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving…' : 'Save draft'}
                    </button>
                    <button onClick={publish}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                        Publish →
                    </button>
                </div>
            </div>

            {/* Canvas row */}
            <div className="flex flex-1 overflow-hidden">
                {/* Palette */}
                <div className="flex shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
                    <NodePalette />

                    {/* Version history */}
                    {workflow.versions?.length > 0 && (
                        <div className="mt-4 w-44">
                            <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Versions</p>
                            <div className="space-y-1">
                                {workflow.versions.slice(0, 6).map(v => (
                                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
                                        <span className="font-semibold text-slate-700">v{v.version}</span>
                                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${v.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{v.status}</span>
                                        {v.status !== workflow.status && (
                                            <button onClick={() => router.post(route('admin.routing.workflows.rollback', [workflow.id, v.id]), {}, { onSuccess: () => toast.success('Rolled back') })}
                                                className="text-indigo-500 hover:text-indigo-700 text-[10px] font-semibold">↩</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* React Flow */}
                <div ref={dropRef} className="flex-1 overflow-hidden" onDrop={onDrop} onDragOver={onDragOver}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setRfInstance}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={NODE_TYPES}
                        defaultEdgeOptions={{ type: 'smoothstep' }}
                        fitView
                        fitViewOptions={{ padding: 0.2 }}
                        deleteKeyCode={['Backspace', 'Delete']}
                    >
                        <Background variant="dots" gap={20} size={1} color="#e2e8f0" />
                        <Controls showInteractive={false} className="!border-slate-200 !bg-white !shadow-sm" />
                        <MiniMap nodeStrokeWidth={3} zoomable pannable
                            className="!border-slate-200 !bg-white !shadow-sm"
                            nodeColor={n => ({ start: '#6366f1', provider: '#e2e8f0', condition: '#fcd34d', weighted: '#c4b5fd', failover: '#fb923c', success: '#6ee7b7', failure: '#fca5a5' }[n.type] || '#e2e8f0')} />

                        {nodes.length === 0 && (
                            <Panel position="top-center">
                                <div className="mt-16 flex flex-col items-center gap-3 text-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500"><Zap size={28} strokeWidth={2} /></div>
                                    <p className="text-sm font-semibold text-slate-700">Start building your routing workflow</p>
                                    <p className="text-xs text-slate-400">Drag nodes from the left panel onto the canvas</p>
                                </div>
                            </Panel>
                        )}

                        {/* Validation errors */}
                        {workflow.validation_errors?.length > 0 && (
                            <Panel position="bottom-center">
                                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 shadow-sm">
                                    {workflow.validation_errors.map((e, i) => (
                                        <p key={i} className="flex items-center gap-1 text-xs font-medium text-red-700"><AlertTriangle size={11} strokeWidth={2} />{e}</p>
                                    ))}
                                </div>
                            </Panel>
                        )}
                    </ReactFlow>
                </div>

                {/* Config panel */}
                <div className="flex shrink-0 border-l border-slate-200 bg-slate-50 p-3">
                    <ConfigPanel
                        node={selectedNode}
                        providers={allProviders}
                        onUpdate={updateNodeData}
                        onDelete={deleteNode}
                    />
                </div>
            </div>

            {/* Simulation */}
            <SimulationPanel nodes={nodes} edges={edges} />
        </div>
    );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function Builder({ workflow, providers, merchantProviders }) {
    return (
        <AdminLayout title={`Builder — ${workflow.name}`}>
            <Head title={`Builder · ${workflow.name}`} />
            <ReactFlowProvider>
                <WorkflowBuilder
                    workflow={workflow}
                    providers={providers}
                    merchantProviders={merchantProviders}
                />
            </ReactFlowProvider>
        </AdminLayout>
    );
}
