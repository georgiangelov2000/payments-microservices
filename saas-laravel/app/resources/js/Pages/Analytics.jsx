import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProviderBrand, { getProviderMeta } from '@/Components/ProviderBrand';
import { fmt, fmtCurrency, fmtMs } from '@/utils';
import {
    TrendingUp, TrendingDown, Minus,
    CheckCircle2, XCircle, Zap, Clock,
    DollarSign, Activity,
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

const STATUS_OPTIONS = [
    { value: '', labelKey: 'analytics.statusFilters.all' },
    { value: 'pending', labelKey: 'analytics.statusFilters.pending' },
    { value: 'processing', labelKey: 'analytics.statusFilters.processing' },
    { value: 'succeeded', labelKey: 'analytics.statusFilters.succeeded' },
    { value: 'failed', labelKey: 'analytics.statusFilters.failed' },
    { value: 'cancelled', labelKey: 'analytics.statusFilters.cancelled' },
    { value: 'refunded', labelKey: 'analytics.statusFilters.refunded' },
    { value: 'partially_refunded', labelKey: 'analytics.statusFilters.partiallyRefunded' },
    { value: 'disputed', labelKey: 'analytics.statusFilters.disputed' },
    { value: 'expired', labelKey: 'analytics.statusFilters.expired' },
];

function analyticsParams(days, env, trendStatus) {
    const params = { days, env };
    if (trendStatus) {
        params.trend_status = trendStatus;
    }

    return params;
}

function TrendTooltip({ active, payload, currency }) {
    const { t } = useTranslation();

    if (!active || !payload?.length) return null;

    const row = payload[0]?.payload ?? {};
    const volume = payload.find((item) => item.dataKey === 'volume')?.value ?? 0;
    const payments = payload.find((item) => item.dataKey === 'total')?.value ?? 0;
    const succeeded = row.succeeded ?? 0;
    const successRate = row.success_rate ?? 0;

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
            <p className="mb-1 font-semibold text-slate-900">{row.date}</p>
            <p className="tabular-nums text-indigo-700">{fmtCurrency(volume, currency)}</p>
            <p className="mt-0.5 text-slate-500">{fmt(payments)} {t('analytics.payments')}</p>
            <p className="text-slate-400">{fmt(succeeded)} {t('analytics.succeeded').toLowerCase()} · {Number(successRate).toFixed(1)}%</p>
        </div>
    );
}

function PaymentTrendChart({ data, currency, days, environment, trendStatus }) {
    const { t } = useTranslation();
    const points = (data ?? []).map((row) => ({
        ...row,
        dateLabel: row.date?.slice(5) ?? row.date,
        total: Number(row.total ?? 0),
        succeeded: Number(row.succeeded ?? 0),
        volume: Number(row.volume ?? 0),
        success_rate: Number(row.success_rate ?? 0),
    }));

    const handleStatusChange = (e) => {
        router.get(
            route('analytics'),
            analyticsParams(days, environment, e.target.value),
            { preserveScroll: true },
        );
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">{t('analytics.paymentTrend')}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{t('analytics.paymentTrendHint')}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />{t('analytics.paidVolume')}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-300" />{t('analytics.totalPayments')}</span>
                    </div>
                    <select
                        value={trendStatus ?? ''}
                        onChange={handleStatusChange}
                        className="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                        {STATUS_OPTIONS.map(option => (
                            <option key={option.value || 'all'} value={option.value}>
                                {t(option.labelKey)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {!points.length ? (
                <p className="py-10 text-center text-sm text-slate-400">{t('analytics.noData')}</p>
            ) : (
                <div className="h-72 rounded-xl border border-slate-200 bg-white px-2 py-3">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={points} margin={{ top: 16, right: 10, bottom: 4, left: 0 }}>
                            <defs>
                                <linearGradient id="merchantPaidVolumeTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.36} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="dateLabel"
                                axisLine={false}
                                tickLine={false}
                                minTickGap={18}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="volume"
                                axisLine={false}
                                tickLine={false}
                                width={58}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={(value) => fmtCurrency(value, currency)}
                            />
                            <YAxis
                                yAxisId="payments"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                width={36}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                content={<TrendTooltip currency={currency} />}
                                cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Bar
                                yAxisId="payments"
                                dataKey="total"
                                name={t('analytics.totalPayments')}
                                barSize={18}
                                radius={[5, 5, 0, 0]}
                                fill="#c4b5fd"
                            />
                            <Area
                                yAxisId="volume"
                                type="monotone"
                                dataKey="volume"
                                name={t('analytics.paidVolume')}
                                stroke="#4f46e5"
                                strokeWidth={2.5}
                                fill="url(#merchantPaidVolumeTrend)"
                                dot={{ r: 3, strokeWidth: 2, fill: '#ffffff', stroke: '#4f46e5' }}
                                activeDot={{ r: 5, strokeWidth: 2, fill: '#4f46e5', stroke: '#ffffff' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rich Provider Performance Card (matches admin panel style)
// ─────────────────────────────────────────────────────────────────────────────

function ProviderCard({ provider }) {
    const { t } = useTranslation();
    const name = provider.provider ?? provider.provider_alias ?? 'Unknown';
    const providerMeta = getProviderMeta(name, name);
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
                    <ProviderBrand alias={name} label={name} size="md" variant="icon" />
                    <div>
                        <p className="font-semibold text-slate-900">{providerMeta.label}</p>
                        <p className="text-xs text-slate-400">{t('analytics.providerTotalPayments', { count: fmt(provider.total) })}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{fmt(provider.succeeded)}</p>
                    <p className="text-xs text-slate-400">{t('analytics.paidPayments')}</p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: t('analytics.succeeded'), value: fmt(provider.succeeded), Icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                    { label: t('analytics.pending'), value: fmt(provider.pending), Icon: Clock, color: 'text-amber-600 bg-amber-50' },
                    { label: t('analytics.failed'), value: fmt(provider.failed), Icon: XCircle, color: 'text-red-600 bg-red-50' },
                    { label: t('analytics.paidVolume'), value: money(provider.paid_volume), Icon: DollarSign, color: 'text-indigo-600 bg-indigo-50' },
                    { label: t('analytics.avgPaid'), value: money(provider.avg_payment), Icon: Zap, color: 'text-slate-600 bg-slate-100' },
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
                    {t('analytics.mixedCurrencyRawAmounts')}
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

function EnvSelector({ current, days, trendStatus }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-3">
            {ENV_TABS.map(({ key, label, Icon, activeCls, dotCls }) => {
                const isActive = current === key
                return (
                    <button
                        key={key}
                        onClick={() => router.get(route('analytics'), analyticsParams(days, key, trendStatus), { preserveScroll: false })}
                        className={[
                            'flex items-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-semibold transition-all',
                            isActive
                                ? activeCls + ' shadow-sm'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700',
                        ].join(' ')}
                    >
                        {isActive && <span className={`h-2 w-2 rounded-full ${dotCls}`} />}
                        <Icon size={15} strokeWidth={2} />
                        {t(`common.badges.${key}`)}
                        {isActive && (
                            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${key === 'test' ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600'}`}>
                                {t('analytics.active')}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function PeriodSelector({ current, env, trendStatus }) {
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
                    onClick={() => router.get(route('analytics'), analyticsParams(o.value, env, trendStatus), { preserveScroll: false })}
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
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Analytics({
    days,
    environment,
    trendStatus,
    overview,
    dailyTrend,
    providerPerformance,
}) {
    const { t } = useTranslation();

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">{t('analytics.title')}</h2>
                    <PeriodSelector current={days} env={environment} trendStatus={trendStatus} />
                </div>
            }
        >
            <Head title={t('analytics.title')} />

            <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">

                {/* Environment switcher */}
                <EnvSelector current={environment} days={days} trendStatus={trendStatus} />

                {/* KPI row */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <KpiCard
                        label={t('analytics.successRate')}
                        value={`${overview.success_rate}%`}
                        delta={overview.delta_rate}
                        suffix="pp"
                        Icon={CheckCircle2}
                        accentColor={overview.success_rate >= 90 ? 'bg-emerald-500' : overview.success_rate >= 70 ? 'bg-amber-500' : 'bg-red-500'}
                    />
                    <KpiCard
                        label={t('analytics.volumeDays', { days })}
                        value={fmtCurrency(overview.volume, overview.currency)}
                        delta={overview.delta_volume}
                        Icon={DollarSign}
                        accentColor="bg-indigo-500"
                    />
                    <KpiCard
                        label={t('analytics.totalPayments')}
                        value={fmt(overview.total)}
                        delta={overview.delta_total}
                        Icon={Activity}
                        accentColor="bg-blue-500"
                    />
                    <KpiCard
                        label={t('analytics.succeeded')}
                        value={fmt(overview.succeeded)}
                        sub={t('analytics.succeededOfTotal', { succeeded: overview.succeeded, total: overview.total })}
                        Icon={CheckCircle2}
                        accentColor="bg-emerald-500"
                    />
                    <KpiCard
                        label={t('analytics.failed')}
                        value={fmt(overview.failed)}
                        Icon={XCircle}
                        accentColor="bg-red-500"
                    />
                </div>

                {/* Latency KPI */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label={t('analytics.avgLatency')}
                        value={fmtMs(overview.avg_latency_ms)}
                        Icon={Clock}
                        accentColor="bg-slate-400"
                    />
                </div>

                {/* Provider performance cards */}
                <section>
                    <h3 className="mb-3 text-base font-semibold text-slate-900">{t('analytics.providerPerformance')}</h3>
                    {providerPerformance.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
                            <BarChart2 size={32} strokeWidth={1.25} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-sm text-slate-400" dangerouslySetInnerHTML={{ __html: t('analytics.noProviderPayments', { environment: `<strong>${environment}</strong>` }) }} />
                            <p className="mt-1 text-xs text-slate-400">{t('analytics.noProviderAttemptsHint')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {providerPerformance.map(p => (
                                <ProviderCard key={p.provider ?? p.provider_alias} provider={p} />
                            ))}
                        </div>
                    )}
                </section>

                <PaymentTrendChart
                    data={dailyTrend}
                    currency={overview.currency}
                    days={days}
                    environment={environment}
                    trendStatus={trendStatus}
                />

            </div>
        </AuthenticatedLayout>
    );
}
