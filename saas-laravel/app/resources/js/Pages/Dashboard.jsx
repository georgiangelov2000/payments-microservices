import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    CreditCard, TrendingUp, CheckCircle2, Clock, XCircle,
    DollarSign, BarChart2, ArrowRight, TrendingDown,
} from 'lucide-react';

function fmtCurrency(n, currency = 'USD') {
    if (n == null || n === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, maximumFractionDigits: 0,
    }).format(n);
}

function fmt(n) {
    if (n == null) return '—';
    return Number(n).toLocaleString('en-US');
}

function Sparkline({ data, color = '#6366f1' }) {
    if (!data || !data.length) return null;
    const max = Math.max(...data.map(d => d.total), 1);
    const W = 56, H = 28, gap = 3;
    const barW = (W - gap * (data.length - 1)) / data.length;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }} className="shrink-0">
            {data.map((d, i) => {
                const h = Math.max(2, (d.total / max) * H);
                return (
                    <rect key={i} x={i * (barW + gap)} y={H - h} width={barW} height={h}
                        rx="1" fill={color} opacity={i === data.length - 1 ? 1 : 0.4} />
                );
            })}
        </svg>
    );
}

function StatCard({ label, value, sub, Icon, iconBg, iconColor, accent, spark, delta }) {
    const deltaPos = delta > 0;
    const DeltaIcon = deltaPos ? TrendingUp : TrendingDown;
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="flex items-start justify-between pl-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value ?? 0}</p>
                    {(sub || delta != null) && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            {sub && <span>{sub}</span>}
                            {delta != null && Math.abs(delta) > 0 && (
                                <span className={`flex items-center gap-0.5 font-medium ${deltaPos ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <DeltaIcon size={11} strokeWidth={2} />
                                    {Math.abs(delta)}pp vs prev 7d
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    {spark && <Sparkline data={spark} />}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                        <Icon size={18} strokeWidth={1.75} className={iconColor} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SuccessRateRing({ rate }) {
    const r = 28, cx = 36, cy = 36, strokeW = 6;
    const circumference = 2 * Math.PI * r;
    const pct = Math.min(Math.max(rate ?? 0, 0), 100);
    const dash = (pct / 100) * circumference;
    const color = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';
    return (
        <svg viewBox="0 0 72 72" style={{ width: 72, height: 72 }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fontWeight="700" fill={color}>{pct}%</text>
        </svg>
    );
}

export default function Dashboard({ summary }) {
    const s = summary ?? {};
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
                    <Link href={route('analytics')}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                        <BarChart2 size={14} strokeWidth={2} />
                        Full analytics
                        <ArrowRight size={12} strokeWidth={2} />
                    </Link>
                </div>
            }
        >
            <Head title="Dashboard" />
            <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">

                {/* Top row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />
                        <div className="pl-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Success Rate</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Last 7 days</p>
                        </div>
                        <div className="mt-3 flex items-center gap-4 pl-2">
                            <SuccessRateRing rate={s.success_rate_7d} />
                            <div>
                                <p className="text-sm font-medium text-slate-700">{fmt(s.succeeded_7d)} of {fmt(s.payments_7d)}</p>
                                <p className="text-xs text-slate-400">payments succeeded</p>
                                {s.delta_volume != null && Math.abs(s.delta_volume) > 0 && (
                                    <p className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${s.delta_volume >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {s.delta_volume >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                        {Math.abs(s.delta_volume)}pp vs prev 7d
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <StatCard label="Volume This Month" value={fmtCurrency(s.volume_this_month, s.currency)}
                        sub="Successful payments only" Icon={DollarSign}
                        iconBg="bg-indigo-50" iconColor="text-indigo-600" accent="bg-indigo-500" />
                    <StatCard label="Volume Last 7 Days" value={fmtCurrency(s.volume_7d, s.currency)}
                        Icon={TrendingUp} iconBg="bg-blue-50" iconColor="text-blue-600" accent="bg-blue-500"
                        spark={s.sparkline} />
                    <StatCard label="This Month" value={fmt(s.payments_this_month)} sub="Total payments"
                        Icon={CreditCard} iconBg="bg-slate-100" iconColor="text-slate-600" accent="bg-slate-400" />
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="All-time Payments" value={fmt(s.total_payments)}
                        Icon={CreditCard} iconBg="bg-slate-100" iconColor="text-slate-500" accent="bg-slate-400" />
                    <StatCard label="Successful" value={fmt(s.payments_finished)}
                        Icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" accent="bg-emerald-500" />
                    <StatCard label="Pending" value={fmt(s.payments_pending)}
                        Icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" accent="bg-amber-500" />
                    <StatCard label="Failed" value={fmt(s.payments_failed)}
                        Icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" accent="bg-red-500" />
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'View all payments', href: route('payments.index'), icon: CreditCard },
                        { label: 'Analytics & trends', href: route('analytics'), icon: BarChart2 },
                        { label: 'Manage webhooks', href: route('webhooks.index'), icon: TrendingUp },
                    ].map(({ label, href, icon: Icon }) => (
                        <Link key={label} href={href}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors group">
                            <div className="flex items-center gap-2">
                                <Icon size={16} strokeWidth={1.75} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                {label}
                            </div>
                            <ArrowRight size={14} strokeWidth={2} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </Link>
                    ))}
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
