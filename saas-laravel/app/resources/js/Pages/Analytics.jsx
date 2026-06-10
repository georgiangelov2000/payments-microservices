import { Head, router } from '@inertiajs/react';
import { useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { fmt, fmtCurrency, fmtMs, fmtRate } from '@/utils';
import {
    TrendingUp, TrendingDown, Minus,
    CheckCircle2, XCircle, Zap, Clock,
    DollarSign, Activity, AlertTriangle,
    FlaskConical, Globe, BarChart2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────


function Delta({ value, suffix = 'pp', reverse = false }) {
    if (value == null) return null;
    const pos = reverse ? value < 0 : value > 0;
    const neg = reverse ? value > 0 : value < 0;
    const Icon = pos ? TrendingUp : neg ? TrendingDown : Minus;
    const color = pos ? 'text-emerald-600' : neg ? 'text-red-500' : 'text-slate-400';
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
            <Icon size={12} strokeWidth={2} />
            {Math.abs(value)}{suffix}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, delta, suffix, Icon, accentColor, reverseDelta }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute left-0 top-0 h-full w-1 ${accentColor}`} />
            <div className="flex items-start justify-between pl-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    {(sub || delta != null) && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            {sub && <span>{sub}</span>}
                            {delta != null && <Delta value={delta} suffix={suffix ?? '%'} reverse={reverseDelta} />}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                        <Icon size={18} strokeWidth={1.75} className="text-slate-500" />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline area chart (SVG)
// ─────────────────────────────────────────────────────────────────────────────

const W = 800;
const H = 140;
const PAD = { top: 12, right: 16, bottom: 28, left: 44 };

function areaPath(points, yMin, yMax, key) {
    if (!points.length) return '';
    const xs = points.map((_, i) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right));
    const ys = points.map(p => {
        const range = yMax - yMin || 1;
        return PAD.top + (1 - (p[key] - yMin) / range) * (H - PAD.top - PAD.bottom);
    });
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const bottom = H - PAD.bottom;
    return `${line} L${xs[xs.length - 1].toFixed(1)},${bottom} L${xs[0].toFixed(1)},${bottom} Z`;
}

function linePath(points, yMin, yMax, key) {
    if (!points.length) return '';
    return points.map((p, i) => {
        const x = PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
        const range = yMax - yMin || 1;
        const y = PAD.top + (1 - (p[key] - yMin) / range) * (H - PAD.top - PAD.bottom);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
}

function AreaChart({ data, dataKey, label, color, formatter, yMin: yMinProp, yMax: yMaxProp }) {
    const values = data.map(d => d[dataKey]);
    const yMin = yMinProp ?? Math.min(...values);
    const yMax = yMaxProp ?? Math.max(...values);

    const area = useMemo(() => areaPath(data, yMin, yMax, dataKey), [data, dataKey, yMin, yMax]);
    const line = useMemo(() => linePath(data, yMin, yMax, dataKey), [data, dataKey, yMin, yMax]);

    // X-axis ticks: show first, mid, last dates
    const tickIdxs = data.length >= 3 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0];
    const xForIdx = i => PAD.left + (i / Math.max(data.length - 1, 1)) * (W - PAD.left - PAD.right);

    // Y-axis ticks
    const yTicks = [yMax, (yMax + yMin) / 2, yMin];
    const yForVal = v => {
        const range = yMax - yMin || 1;
        return PAD.top + (1 - (v - yMin) / range) * (H - PAD.top - PAD.bottom);
    };

    const gradId = `grad-${dataKey}`;

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {/* Grid lines */}
                {yTicks.map((v, i) => (
                    <g key={i}>
                        <line
                            x1={PAD.left} y1={yForVal(v).toFixed(1)}
                            x2={W - PAD.right} y2={yForVal(v).toFixed(1)}
                            stroke="#e2e8f0" strokeWidth="1"
                        />
                        <text
                            x={PAD.left - 6} y={yForVal(v) + 4}
                            textAnchor="end" fontSize="10" fill="#94a3b8"
                        >
                            {formatter ? formatter(v) : fmt(v, 0)}
                        </text>
                    </g>
                ))}
                {/* Area fill */}
                <path d={area} fill={`url(#${gradId})`} />
                {/* Line */}
                <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* X-axis labels */}
                {tickIdxs.map(i => (
                    <text
                        key={i}
                        x={xForIdx(i)} y={H - 4}
                        textAnchor="middle" fontSize="10" fill="#94a3b8"
                    >
                        {data[i]?.date?.slice(5)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar chart (horizontal, for decline codes / latency buckets)
// ─────────────────────────────────────────────────────────────────────────────

function HorizontalBar({ label, value, maxValue, color, sub }) {
    const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-slate-700 truncate max-w-[60%]">{label}</span>
                <span className="text-xs font-semibold text-slate-600">{fmt(value)}{sub ? ` ${sub}` : ''}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider success rate bar (inline table bar)
// ─────────────────────────────────────────────────────────────────────────────

function RateBar({ rate }) {
    const pct = Math.min(Math.max(rate ?? 0, 0), 100);
    const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color }}>{pct.toFixed(1)}%</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich Provider Performance Card (matches admin panel style)
// ─────────────────────────────────────────────────────────────────────────────

function rateColor(rate) {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-amber-600';
    return 'text-red-600';
}

function rateBarColor(rate) {
    if (rate >= 95) return 'bg-green-500';
    if (rate >= 80) return 'bg-amber-500';
    return 'bg-red-500';
}

function ProviderCard({ provider }) {
    const rate = Number(provider.success_rate ?? 0);
    const name = provider.provider ?? provider.provider_alias ?? 'Unknown';
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white uppercase">
                        {name.slice(0, 1)}
                    </div>
                    <div>
                        <p className="font-semibold capitalize text-slate-900">{name}</p>
                        <p className="text-xs text-slate-400">{fmt(provider.total ?? provider.total_attempts)} attempts</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-bold ${rateColor(rate)}`}>{fmtRate(rate)}</p>
                    <p className="text-xs text-slate-400">approval rate</p>
                </div>
            </div>

            {/* Rate bar */}
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                    className={`h-full rounded-full transition-all ${rateBarColor(rate)}`}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: 'Succeeded', value: fmt(provider.succeeded),       Icon: CheckCircle2, color: 'text-green-600 bg-green-50'   },
                    { label: 'Failed',    value: fmt(provider.failed),           Icon: XCircle,      color: 'text-red-600 bg-red-50'       },
                    { label: 'Timeouts',  value: fmt(provider.timeouts ?? 0),    Icon: Clock,        color: 'text-amber-600 bg-amber-50'   },
                    { label: 'Avg latency', value: fmtMs(provider.avg_latency_ms), Icon: Zap,        color: 'text-indigo-600 bg-indigo-50' },
                ].map(({ label, value, Icon: I, color }) => (
                    <div key={label} className={`rounded-lg px-3 py-2 ${color.split(' ')[1]}`}>
                        <div className="flex items-center gap-1 mb-0.5">
                            <I size={11} strokeWidth={2} className={color.split(' ')[0]} />
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                        </div>
                        <p className={`text-sm font-bold ${color.split(' ')[0]}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Latency range */}
            {provider.min_latency_ms != null && (
                <p className="mt-3 text-xs text-slate-400">
                    Latency range: {fmtMs(provider.min_latency_ms)} – {fmtMs(provider.max_latency_ms)}
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Period selector
// ─────────────────────────────────────────────────────────────────────────────

const ENV_TABS = [
    { key: 'test', label: 'Test', Icon: FlaskConical, activeCls: 'border-indigo-500 bg-indigo-50 text-indigo-700', dotCls: 'bg-indigo-400' },
    { key: 'live', label: 'Live', Icon: Globe,        activeCls: 'border-violet-500 bg-violet-50 text-violet-700', dotCls: 'bg-violet-400' },
]

function EnvSelector({ current, days }) {
    return (
        <div className="flex items-center gap-3">
            {ENV_TABS.map(({ key, label, Icon, activeCls, dotCls }) => {
                const isActive = current === key
                return (
                    <button
                        key={key}
                        onClick={() => router.get(route('analytics'), { days, env: key }, { preserveScroll: false })}
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
    )
}

function PeriodSelector({ current, env }) {
    const options = [
        { label: '7d',  value: 7 },
        { label: '30d', value: 30 },
        { label: '90d', value: 90 },
    ];
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            {options.map(o => (
                <button
                    key={o.value}
                    onClick={() => router.get(route('analytics'), { days: o.value, env }, { preserveScroll: false })}
                    className={[
                        'px-3 py-1.5 text-xs font-semibold transition-colors',
                        current === o.value
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing strategy distribution
// ─────────────────────────────────────────────────────────────────────────────

const STRATEGY_COLORS = {
    priority:    '#6366f1',
    weighted:    '#06b6d4',
    conditional: '#f59e0b',
    failover:    '#10b981',
};

const STRATEGY_COPY = {
    priority: {
        label: 'Priority routing',
        description: 'Payments follow your configured provider order, then use fallback providers when needed.',
    },
    weighted: {
        label: 'Traffic distribution',
        description: 'Payments are split across providers by percentage weights.',
    },
    conditional: {
        label: 'Rule-based routing',
        description: 'Payments are routed by rules such as country, currency, payment method, or amount.',
    },
    failover: {
        label: 'Failover routing',
        description: 'Payments move to the next provider after a provider error, decline, or timeout.',
    },
};

function StrategyBreakdown({ data, environment }) {
    const total = data.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
    if (!total) return <p className="text-center text-sm text-slate-400 py-6">No routing data yet</p>;

    return (
        <div className="space-y-4">
            {data.map((row) => {
                const strategy = row.strategy ?? 'unknown';
                const copy = STRATEGY_COPY[strategy] ?? {
                    label: `${strategy.charAt(0).toUpperCase()}${strategy.slice(1)} routing`,
                    description: 'Payments used this routing mode.',
                };
                const count = Number(row.count ?? 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const color = STRATEGY_COLORS[strategy] ?? '#64748b';

                return (
                    <div key={strategy} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                                    <p className="text-sm font-semibold text-slate-800">{copy.label}</p>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{copy.description}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-slate-900">{fmt(count)}</p>
                                <p className="text-[11px] text-slate-400">payments</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: color }}
                                />
                            </div>
                            <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-600">
                                {pct.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                );
            })}
            <p className="text-xs text-slate-400">
                Based on {fmt(total)} payments in the selected {environment} environment.
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Analytics({
    days,
    environment,
    overview,
    dailyTrend,
    providerPerformance,
    topDeclineCodes,
    routingDistribution,
    latencyBuckets,
}) {
    const maxDecline = topDeclineCodes[0]?.count ?? 1;
    const maxLatency = Math.max(...latencyBuckets.map(b => b.count), 1);

    const successRateMin = Math.max(0, Math.min(...dailyTrend.map(d => d.success_rate)) - 5);
    const successRateMax = Math.min(100, Math.max(...dailyTrend.map(d => d.success_rate)) + 5);
    const volumeMax = Math.max(...dailyTrend.map(d => d.volume), 0.01);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Analytics</h2>
                    <PeriodSelector current={days} env={environment} />
                </div>
            }
        >
            <Head title="Analytics" />

            <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">

                {/* Environment switcher */}
                <EnvSelector current={environment} days={days} />

                {/* KPI row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <KpiCard
                        label="Success Rate"
                        value={`${overview.success_rate}%`}
                        delta={overview.delta_rate}
                        suffix="pp"
                        Icon={CheckCircle2}
                        accentColor={overview.success_rate >= 90 ? 'bg-emerald-500' : overview.success_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                    <KpiCard
                        label={`Volume (${days}d)`}
                        value={fmtCurrency(overview.volume, overview.currency)}
                        delta={overview.delta_volume}
                        Icon={DollarSign}
                        accentColor="bg-indigo-500"
                    />
                    <KpiCard
                        label="Total Payments"
                        value={fmt(overview.total)}
                        delta={overview.delta_total}
                        Icon={Activity}
                        accentColor="bg-blue-500"
                    />
                    <KpiCard
                        label="Succeeded"
                        value={fmt(overview.succeeded)}
                        sub={`${overview.succeeded} of ${overview.total}`}
                        Icon={CheckCircle2}
                        accentColor="bg-emerald-500"
                    />
                    <KpiCard
                        label="Failed"
                        value={fmt(overview.failed)}
                        Icon={XCircle}
                        accentColor="bg-red-500"
                    />
                </div>

                {/* Latency KPI */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="Avg Latency"
                        value={fmtMs(overview.avg_latency_ms)}
                        Icon={Clock}
                        accentColor="bg-slate-400"
                    />
                </div>

                {/* Provider performance cards */}
                <section>
                    <h3 className="mb-3 text-base font-semibold text-slate-900">Provider Performance</h3>
                    {providerPerformance.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                            <BarChart2 size={32} strokeWidth={1.25} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm text-slate-400">No routing attempts recorded yet for <strong>{environment}</strong> environment.</p>
                            <p className="mt-1 text-xs text-slate-400">Process some payments to see analytics here.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {providerPerformance.map(p => (
                                <ProviderCard key={p.provider ?? p.provider_alias} provider={p} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Trend charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <AreaChart
                        data={dailyTrend}
                        dataKey="success_rate"
                        label="Success Rate Trend (%)"
                        color="#6366f1"
                        formatter={v => `${v.toFixed(0)}%`}
                        yMin={successRateMin}
                        yMax={successRateMax}
                    />
                    <AreaChart
                        data={dailyTrend}
                        dataKey="volume"
                        label="Payment Volume Trend"
                        color="#06b6d4"
                        formatter={v => fmtCurrency(v)}
                        yMin={0}
                        yMax={volumeMax}
                    />
                </div>

                {/* Total payments trend */}
                <AreaChart
                    data={dailyTrend}
                    dataKey="total"
                    label="Daily Payment Count"
                    color="#f59e0b"
                    formatter={v => fmt(v, 0)}
                    yMin={0}
                    yMax={Math.max(...dailyTrend.map(d => d.total), 1)}
                />

                {/* Bottom row: decline codes + routing distribution + latency buckets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                    {/* Decline codes */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700">Top Decline Codes</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Most frequent error codes across all attempts</p>
                        </div>
                        {topDeclineCodes.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-4">No declines recorded</p>
                        ) : (
                            topDeclineCodes.map((d, i) => (
                                <HorizontalBar
                                    key={i}
                                    label={d.error_code}
                                    value={d.count}
                                    maxValue={maxDecline}
                                    color="#ef4444"
                                />
                            ))
                        )}
                    </div>

                    {/* Routing strategy distribution */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-700">Routing Mode Used</h3>
                            <p className="text-xs text-slate-400 mt-0.5">How your payments were routed</p>
                        </div>
                        {routingDistribution.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-4">No data</p>
                        ) : (
                            <StrategyBreakdown data={routingDistribution} environment={environment} />
                        )}
                    </div>

                    {/* Latency buckets */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700">Latency Distribution</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Routing attempt response times</p>
                        </div>
                        {latencyBuckets.every(b => b.count === 0) ? (
                            <p className="text-center text-sm text-slate-400 py-4">No latency data</p>
                        ) : (
                            latencyBuckets.map((b, i) => (
                                <HorizontalBar
                                    key={i}
                                    label={b.bucket}
                                    value={b.count}
                                    maxValue={maxLatency}
                                    color="#6366f1"
                                    sub="req"
                                />
                            ))
                        )}
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
