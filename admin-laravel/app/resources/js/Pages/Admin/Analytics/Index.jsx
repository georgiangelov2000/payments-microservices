import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { fmt, fmtRate, fmtMs, fmtCurrency } from '@/utils';
import {
    CheckCircle2, XCircle, Zap, BarChart2, DollarSign, Coins,
    TrendingUp, Activity, ArrowRight, Clock,
} from 'lucide-react';
import ProviderBrand, { getProviderMeta } from '@/Components/ProviderBrand';

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, Icon, iconBg, iconColor, accent }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="flex items-start justify-between pl-2">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon size={18} strokeWidth={1.75} className={iconColor} />
                </div>
            </div>
        </div>
    );
}

// ─── Provider row ─────────────────────────────────────────────────────────────

function ProviderCard({ provider }) {
    const providerMeta = getProviderMeta(provider.provider, provider.provider);
    const hasMixedCurrencies = Number(provider.currencies_count ?? 0) > 1;
    const currency = provider.currency || 'USD';
    const money = (value) => hasMixedCurrencies
        ? Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : fmtCurrency(value, currency);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <ProviderBrand alias={provider.provider} label={provider.provider} size="md" variant="icon" />
                    <div>
                        <p className="font-semibold text-slate-900">{providerMeta.label}</p>
                        <p className="text-xs text-slate-400">{fmt(provider.total)} total payments</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{fmt(provider.succeeded)}</p>
                    <p className="text-xs text-slate-400">paid payments</p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: 'Successful', value: fmt(provider.succeeded), Icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                    { label: 'Pending', value: fmt(provider.pending), Icon: Clock, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Failed', value: fmt(provider.failed), Icon: XCircle, color: 'text-red-600 bg-red-50' },
                    { label: 'Paid volume', value: money(provider.paid_volume), Icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
                    {
                        label: 'Avg paid',
                        value: money(provider.avg_payment),
                        Icon: Coins,
                        color: 'text-slate-600 bg-slate-100',
                    },
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
            {hasMixedCurrencies && (
                <p className="mt-3 text-xs text-slate-400">
                    Mixed currencies are displayed as raw stored amounts, not converted totals.
                </p>
            )}
        </div>
    );
}

// ─── Routing behavior ────────────────────────────────────────────────────────

const STRATEGY_COLORS = {
    priority: '#6366f1',
    weighted: '#06b6d4',
    conditional: '#f59e0b',
    failover: '#10b981',
};

const STRATEGY_COPY = {
    priority: {
        label: 'Priority routing',
        description: 'Payments follow the configured provider order, then use fallback providers when needed.',
        impact: 'Changing the order changes which provider receives a payment first.',
    },
    weighted: {
        label: 'Traffic distribution',
        description: 'Payments are split across providers by percentage weights.',
        impact: 'Changing weights shifts more or less traffic to each provider.',
    },
    conditional: {
        label: 'Rule-based routing',
        description: 'Payments are routed by rules such as country, currency, payment method, or amount.',
        impact: 'Changing rules changes which payments qualify for each provider path.',
    },
    failover: {
        label: 'Failover routing',
        description: 'Payments move to the next provider after a provider error, decline, or timeout.',
        impact: 'Changing failover paths changes how quickly payments recover from provider issues.',
    },
};

function strategyCopy(strategy) {
    const key = String(strategy || 'unknown').toLowerCase();
    const fallbackLabel = `${key.charAt(0).toUpperCase()}${key.slice(1)} routing`;

    return STRATEGY_COPY[key] ?? {
        label: fallbackLabel,
        description: 'Payments used this routing mode during the selected period.',
        impact: 'Review this mode before changing routing rules so traffic moves as expected.',
    };
}

function RoutingBehavior({ strategies }) {
    const total = strategies.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

    if (!total) {
        return (
            <p className="py-6 text-center text-sm text-slate-400">
                No routing data yet for this environment.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {strategies.map((row) => {
                const strategy = String(row.strategy || 'unknown').toLowerCase();
                const copy = strategyCopy(strategy);
                const count = Number(row.total ?? 0);
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
                                <p className="mt-1 text-xs leading-5 text-slate-400">{copy.impact}</p>
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
        </div>
    );
}

// ─── Daily trend mini-chart ───────────────────────────────────────────────────

function DailyTrend({ data }) {
    const points = (data ?? []).map((d) => ({
        date: d.date,
        total: Number(d.total ?? 0),
        failovers: Number(d.failovers ?? 0),
        successes: Number(d.successes ?? 0),
    }));

    if (!points.length) return (
        <p className="py-8 text-center text-sm text-slate-400">No data for the selected period.</p>
    );

    const width = 640;
    const height = 180;
    const paddingX = 18;
    const paddingTop = 16;
    const paddingBottom = 28;
    const chartHeight = height - paddingTop - paddingBottom;
    const maxFailovers = Math.max(...points.map(d => d.failovers), 1);
    const step = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0;

    const coordinates = points.map((d, index) => ({
        ...d,
        x: paddingX + index * step,
        y: paddingTop + chartHeight - (d.failovers / maxFailovers) * chartHeight,
    }));

    const linePath = coordinates
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ');

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[460px]">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-52 w-full overflow-visible"
                    role="img"
                    aria-label="Failover trend over the last 30 days"
                >
                    {[0, 0.5, 1].map((ratio) => {
                        const y = paddingTop + chartHeight - ratio * chartHeight;
                        return (
                            <line
                                key={ratio}
                                x1={paddingX}
                                y1={y}
                                x2={width - paddingX}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                            />
                        );
                    })}
                    <path
                        d={`${linePath} L ${width - paddingX} ${height - paddingBottom} L ${paddingX} ${height - paddingBottom} Z`}
                        fill="#fecaca"
                        opacity="0.35"
                    />
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#f87171"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {coordinates.map((d) => {
                        const failoverRate = d.total > 0 ? (d.failovers / d.total) * 100 : 0;
                        const pointColor = failoverRate > 20 ? '#f87171' : failoverRate > 5 ? '#fbbf24' : '#a5b4fc';

                        return (
                            <g key={d.date}>
                                <title>{`${d.date}: ${d.failovers} failovers / ${d.total} total`}</title>
                                <line
                                    x1={d.x}
                                    y1={d.y}
                                    x2={d.x}
                                    y2={height - paddingBottom}
                                    stroke={pointColor}
                                    strokeWidth="2"
                                    opacity="0.4"
                                />
                                <circle cx={d.x} cy={d.y} r="5" fill={pointColor} stroke="#ffffff" strokeWidth="2" />
                            </g>
                        );
                    })}
                </svg>
                <div className="mt-1 grid grid-cols-3 text-[10px] text-slate-400">
                    <span>{points[0]?.date}</span>
                    <span className="text-center">Max {fmt(maxFailovers)} failovers</span>
                    <span className="text-right">{points[points.length - 1]?.date}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {points.filter(d => d.failovers > 0).slice(-3).map((d) => {
                        const rate = d.total > 0 ? Math.round((d.failovers / d.total) * 100) : 0;

                        return (
                            <div key={d.date} className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[11px] font-medium text-slate-500">{d.date}</p>
                                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                                    {fmt(d.failovers)} failovers
                                </p>
                                <p className="text-[11px] text-slate-400">{rate}% of {fmt(d.total)} attempts</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Error table ──────────────────────────────────────────────────────────────

function ErrorTable({ errors }) {
    if (!errors.length) return (
        <p className="py-8 text-center text-sm text-slate-400">No errors recorded.</p>
    );

    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                <tr>
                    {['Provider', 'Error Code', 'Occurrences', 'Last Seen'].map(h => (
                        <th key={h} className="px-4 py-2 font-medium">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {errors.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">
                            <ProviderBrand alias={e.provider} label={e.provider} variant="compact" />
                        </td>
                        <td className="px-4 py-2">
                            <span className="rounded bg-red-50 border border-red-100 px-2 py-0.5 text-xs font-mono text-red-700">
                                {e.error_code}
                            </span>
                        </td>
                        <td className="px-4 py-2 font-medium text-slate-700">{fmt(e.occurrences)}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{e.last_seen ?? '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsIndex({ environment, summary, providers, strategies, dailyTrend, topErrors }) {
    function switchEnv(env) {
        router.get(route('admin.analytics.index'), { environment: env }, { preserveScroll: true });
    }

    return (
        <AdminLayout title="Analytics">
            <Head title="Analytics" />

            {/* Page header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Provider Analytics</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Payment status by provider, failover trends, and error breakdown across all payment providers.
                    </p>
                </div>
                {/* Environment toggle */}
                <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    {['test', 'live'].map(env => (
                        <button
                            key={env}
                            onClick={() => switchEnv(env)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                                environment === env
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {env}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary row */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total Attempts"
                    value={fmt(summary.total_attempts)}
                    Icon={Activity}
                    iconBg="bg-indigo-50" iconColor="text-indigo-600" accent="bg-indigo-500"
                />
                <SummaryCard
                    label="Overall Approval Rate"
                    value={fmtRate(summary.overall_rate)}
                    sub={`${fmt(summary.total_succeeded)} succeeded`}
                    Icon={TrendingUp}
                    iconBg="bg-green-50" iconColor="text-green-600" accent="bg-green-500"
                />
                <SummaryCard
                    label="Total Failures"
                    value={fmt(summary.total_failed)}
                    sub="failed + timeouts"
                    Icon={XCircle}
                    iconBg="bg-red-50" iconColor="text-red-600" accent="bg-red-500"
                />
                <SummaryCard
                    label="Avg Latency"
                    value={fmtMs(summary.avg_latency_ms)}
                    sub="across all providers"
                    Icon={Zap}
                    iconBg="bg-amber-50" iconColor="text-amber-600" accent="bg-amber-500"
                />
            </div>

            {/* Provider performance cards */}
            <section className="mb-6">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Provider Performance</h2>
                {providers?.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                        <BarChart2 size={32} strokeWidth={1.25} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-sm text-slate-400">No payments recorded yet for <strong>{environment}</strong> environment.</p>
                        <p className="mt-1 text-xs text-slate-400">Process some payments to see analytics here.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {providers?.map(p => (
                            <ProviderCard key={p.provider} provider={p} />
                        ))}
                    </div>
                )}
            </section>

            {/* Bottom two-column section */}
            <div className="grid gap-6 lg:grid-cols-2">

                {/* Strategy distribution */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-base font-semibold text-slate-900">Routing behavior</h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            How payments were routed in {environment}. Use this to see which routing mode handled traffic and what changes would affect.
                        </p>
                    </div>
                    <RoutingBehavior strategies={strategies ?? []} />
                </section>

                {/* Failover trend */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-900">Failover Trend (30 days)</h2>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-indigo-300" />Low</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-amber-400" />Medium</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-red-400" />High</span>
                        </div>
                    </div>
                    <DailyTrend data={dailyTrend ?? []} />
                </section>

                {/* Top errors - full width */}
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-slate-900">Top Error Codes</h2>
                        {topErrors?.length > 0 && (
                            <span className="rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                                {topErrors.length} distinct errors
                            </span>
                        )}
                    </div>
                    <ErrorTable errors={topErrors ?? []} />
                </section>
            </div>

            {/* Link back to routing */}
            <div className="mt-6 flex justify-end">
                <Link
                    href={route('admin.routing.index')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    View routing configuration <ArrowRight size={14} strokeWidth={2} />
                </Link>
            </div>
        </AdminLayout>
    );
}
