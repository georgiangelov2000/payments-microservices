import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    CheckCircle2, XCircle, Clock, Zap, BarChart2,
    AlertTriangle, TrendingUp, Activity, ArrowRight,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) { return Number(n ?? 0).toLocaleString(); }
function fmtRate(n) { return `${Number(n ?? 0).toFixed(1)}%`; }
function fmtMs(n) { return n != null ? `${fmt(n)} ms` : '—'; }

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
    const rate = Number(provider.success_rate ?? 0);
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white uppercase">
                        {provider.provider.slice(0, 1)}
                    </div>
                    <div>
                        <p className="font-semibold capitalize text-slate-900">{provider.provider}</p>
                        <p className="text-xs text-slate-400">{fmt(provider.total)} attempts</p>
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
                    { label: 'Succeeded', value: fmt(provider.succeeded), Icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                    { label: 'Failed',    value: fmt(provider.failed),    Icon: XCircle,      color: 'text-red-600 bg-red-50' },
                    { label: 'Timeouts',  value: fmt(provider.timeouts),  Icon: Clock,        color: 'text-amber-600 bg-amber-50' },
                    { label: 'Avg latency', value: fmtMs(provider.avg_latency_ms), Icon: Zap, color: 'text-indigo-600 bg-indigo-50' },
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

// ─── Strategy distribution ────────────────────────────────────────────────────

function StrategyRow({ row, maxTotal }) {
    const width = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
    return (
        <div className="flex items-center gap-3 py-2">
            <span className="w-24 shrink-0 text-xs font-semibold capitalize text-slate-700">{row.strategy}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
            </div>
            <span className="w-12 text-right text-xs text-slate-500">{fmt(row.total)}</span>
            <span className={`w-14 text-right text-xs font-semibold ${rateColor(row.success_rate)}`}>
                {fmtRate(row.success_rate)}
            </span>
        </div>
    );
}

// ─── Daily trend mini-chart ───────────────────────────────────────────────────

function DailyTrend({ data }) {
    if (!data.length) return (
        <p className="py-8 text-center text-sm text-slate-400">No data for the selected period.</p>
    );

    const maxFailovers = Math.max(...data.map(d => d.failovers), 1);

    return (
        <div className="overflow-x-auto">
            <div className="flex items-end gap-1 h-24 min-w-0" style={{ minWidth: `${data.length * 18}px` }}>
                {data.map((d) => {
                    const heightPct = (d.failovers / maxFailovers) * 100;
                    const successPct = d.total > 0 ? (d.failovers / d.total) * 100 : 0;
                    const barColor = successPct > 20 ? 'bg-red-400' : successPct > 5 ? 'bg-amber-400' : 'bg-indigo-300';
                    return (
                        <div
                            key={d.date}
                            className="group relative flex-1 flex flex-col justify-end"
                            title={`${d.date}: ${d.failovers} failovers / ${d.total} total`}
                        >
                            <div
                                className={`w-full rounded-t transition-all ${barColor} hover:opacity-80`}
                                style={{ height: `${Math.max(heightPct, 4)}%` }}
                            />
                            {/* Tooltip */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10">
                                <div className="rounded bg-slate-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                                    {d.date}: {d.failovers} failovers
                                </div>
                                <div className="h-1.5 w-1.5 rotate-45 bg-slate-900" style={{ marginTop: '-3px' }} />
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>{data[0]?.date}</span>
                <span>{data[data.length - 1]?.date}</span>
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
        <table className="min-w-full text-sm">
            <thead>
                <tr className="border-b border-slate-100">
                    {['Provider', 'Error Code', 'Occurrences', 'Last Seen'].map(h => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {errors.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-4 font-medium capitalize text-slate-800">{e.provider}</td>
                        <td className="py-2.5 pr-4">
                            <span className="rounded bg-red-50 border border-red-100 px-2 py-0.5 text-xs font-mono text-red-700">
                                {e.error_code}
                            </span>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-700">{fmt(e.occurrences)}</td>
                        <td className="py-2.5 text-xs text-slate-400">{e.last_seen ?? '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsIndex({ environment, summary, providers, strategies, dailyTrend, topErrors }) {
    const maxStrategyTotal = Math.max(...(strategies?.map(s => s.total) ?? [0]), 1);

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
                        Approval rates, latency, failover trends, and error breakdown across all payment providers.
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
                        <p className="text-sm text-slate-400">No routing attempts recorded yet for <strong>{environment}</strong> environment.</p>
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
                    <h2 className="mb-4 text-base font-semibold text-slate-900">Routing Strategy Distribution</h2>
                    {strategies?.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-400">No data available.</p>
                    ) : (
                        <div className="space-y-1">
                            <div className="flex gap-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                <span className="w-24">Strategy</span>
                                <span className="flex-1">Volume</span>
                                <span className="w-12 text-right">Count</span>
                                <span className="w-14 text-right">Rate</span>
                            </div>
                            {strategies?.map(s => (
                                <StrategyRow key={s.strategy} row={s} maxTotal={maxStrategyTotal} />
                            ))}
                        </div>
                    )}
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
