import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import ProviderBrand from '@/Components/ProviderBrand';
import { fmt, fmtCurrency, fmtDate } from '@/utils';
import {
    Activity,
    CalendarDays,
    CreditCard,
    Download,
    DollarSign,
    FileDown,
    Search,
    SlidersHorizontal,
    Users,
    X,
} from 'lucide-react';

const STATUS_OPTIONS = ['', 'succeeded', 'pending', 'failed', 'refunded', 'processing', 'cancelled', 'disputed', 'expired'];
const EXPORT_FORMATS = ['xlsx', 'csv', 'json', 'pdf'];

function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function currentYear() {
    return String(new Date().getFullYear());
}

function SummaryCard({ label, value, sub, Icon, tone = 'indigo' }) {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-700',
        green: 'bg-green-50 text-green-700',
        amber: 'bg-amber-50 text-amber-700',
        slate: 'bg-slate-100 text-slate-700',
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
                    <Icon size={18} strokeWidth={1.75} />
                </div>
            </div>
        </div>
    );
}

function TrendTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    const amount = payload.find((item) => item.dataKey === 'amount')?.value ?? 0;
    const payments = payload.find((item) => item.dataKey === 'payments')?.value ?? 0;

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg shadow-slate-900/10">
            <p className="mb-1 font-semibold text-slate-900">{label}</p>
            <p className="tabular-nums text-indigo-700">{fmtCurrency(amount)}</p>
            <p className="mt-0.5 text-slate-500">{fmt(payments)} payment{Number(payments) === 1 ? '' : 's'}</p>
        </div>
    );
}

function TrendBars({ trend }) {
    const chartData = trend.map((row) => ({
        period: row.period,
        amount: Number(row.total_amount || 0),
        payments: Number(row.payments_count || 0),
    }));

    if (!trend.length) {
        return (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                No payment trend data for this period.
            </div>
        );
    }

    return (
        <div>
            <div className="h-72 rounded-xl border border-slate-200 bg-white px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 16, right: 10, bottom: 4, left: 0 }}>
                        <defs>
                            <linearGradient id="merchantTrendAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.36} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="period"
                            axisLine={false}
                            tickLine={false}
                            minTickGap={18}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis
                            yAxisId="amount"
                            axisLine={false}
                            tickLine={false}
                            width={58}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
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
                        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Bar
                            yAxisId="payments"
                            dataKey="payments"
                            name="Payments"
                            barSize={18}
                            radius={[5, 5, 0, 0]}
                            fill="#c4b5fd"
                        />
                        <Area
                            yAxisId="amount"
                            type="monotone"
                            dataKey="amount"
                            name="Volume"
                            stroke="#4f46e5"
                            strokeWidth={2.5}
                            fill="url(#merchantTrendAmount)"
                            dot={{ r: 3, strokeWidth: 2, fill: '#ffffff', stroke: '#4f46e5' }}
                            activeDot={{ r: 5, strokeWidth: 2, fill: '#4f46e5', stroke: '#ffffff' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function StatusBreakdown({ counts }) {
    const items = [
        ['succeeded', counts?.paid || 0],
        ['pending', counts?.pending || 0],
        ['failed', counts?.failed || 0],
        ['refunded', counts?.refunded || 0],
    ];

    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map(([status, count]) => (
                <Badge key={status} value={status} label={`${status.charAt(0).toUpperCase() + status.slice(1)}: ${fmt(count)}`} size="sm" />
            ))}
        </div>
    );
}

function exportStatusClasses(status) {
    return {
        queued: 'border-blue-200 bg-blue-50 text-blue-700',
        running: 'border-amber-200 bg-amber-50 text-amber-700',
        completed: 'border-green-200 bg-green-50 text-green-700',
        failed: 'border-red-200 bg-red-50 text-red-700',
    }[status] || 'border-slate-200 bg-slate-50 text-slate-600';
}

function exportStatusLabel(status) {
    return {
        queued: 'Started',
        running: 'In progress',
        completed: 'Completed',
        failed: 'Failed',
    }[status] || status;
}

export default function MerchantPayments({ activity, filters = {}, exports = [] }) {
    const [period, setPeriod] = useState(filters.period || 'monthly');
    const [month, setMonth] = useState(filters.month || currentMonth());
    const [year, setYear] = useState(String(filters.year || currentYear()));
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
    const [exportingFormat, setExportingFormat] = useState(null);

    const merchants = activity.merchants?.data || [];
    const summary = activity.summary || {};
    const range = activity.range || {};
    const hasActiveExport = exports.some((item) => ['queued', 'running'].includes(item.status));

    const activeFilterLabel = useMemo(() => {
        if (period === 'yearly') return year;
        if (period === 'custom') return range.label || 'Custom range';
        return range.label || month;
    }, [period, year, month, range.label]);

    function currentFilterParams() {
        const params = { period };
        if (period === 'monthly') params.month = month;
        if (period === 'yearly') params.year = year;
        if (period === 'custom') {
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
        }
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;

        return params;
    }

    useEffect(() => {
        if (!hasActiveExport) return undefined;

        const timer = window.setInterval(() => {
            router.reload({
                only: ['exports'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 5000);

        return () => window.clearInterval(timer);
    }, [hasActiveExport]);

    function applyFilters(e) {
        e.preventDefault();

        const params = currentFilterParams();

        router.get(route('admin.payments.merchants'), params, {
            preserveScroll: true,
            replace: true,
        });
    }

    function clearFilters() {
        setPeriod('monthly');
        setMonth(currentMonth());
        setYear(currentYear());
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setStatus('');
        router.get(route('admin.payments.merchants'), {}, {
            preserveScroll: true,
            replace: true,
        });
    }

    function startExport(format) {
        setExportingFormat(format);

        router.post(route('admin.payments.merchants.exports.store'), {
            ...currentFilterParams(),
            format,
        }, {
            preserveScroll: true,
            onFinish: () => setExportingFormat(null),
        });
    }

    return (
        <AdminLayout title="Merchant Payments">
            <Head title="Merchant Payments" />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Merchant Payment Activity</h1>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Review merchant payment volume, totals, status mix, and recent transactions.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                        {EXPORT_FORMATS.map((format) => (
                            <button
                                key={format}
                                type="button"
                                onClick={() => startExport(format)}
                                disabled={exportingFormat !== null}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                title={`Export current filters as ${format.toUpperCase()}`}
                            >
                                <FileDown size={13} strokeWidth={2} />
                                {exportingFormat === format ? 'Queueing...' : format}
                            </button>
                        ))}
                    </div>
                    <Link
                        href={route('admin.payments.index')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <CreditCard size={15} strokeWidth={2} />
                        Transaction list
                    </Link>
                </div>
            </div>

            <form onSubmit={applyFilters} className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Period</label>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="min-w-36 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom range</option>
                        </select>
                    </div>

                    {period === 'monthly' && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Month</label>
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {period === 'yearly' && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Year</label>
                            <input
                                type="number"
                                min="2020"
                                max="2100"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    )}

                    {period === 'custom' && (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </>
                    )}

                    <div className="min-w-0 flex-1" style={{ minWidth: '220px' }}>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Merchant</label>
                        <div className="relative">
                            <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search name or email"
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="min-w-40 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            {STATUS_OPTIONS.filter(Boolean).map((option) => (
                                <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                        >
                            <SlidersHorizontal size={14} strokeWidth={2} />
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1"
                        >
                            <X size={14} strokeWidth={2} />
                            Clear
                        </button>
                    </div>
                </div>
            </form>

            <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Merchant payment exports</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Background exports use the active filters and are emailed when complete.</p>
                    </div>
                    {hasActiveExport && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Processing
                        </span>
                    )}
                </div>
                <div className="divide-y divide-slate-100">
                    {exports.length === 0 ? (
                        <div className="px-4 py-5 text-sm text-slate-400">
                            No exports have been requested yet.
                        </div>
                    ) : exports.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-xs font-semibold uppercase text-slate-700">{item.format}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${exportStatusClasses(item.status)}`}>
                                        {exportStatusLabel(item.status)}
                                    </span>
                                    <span className="text-xs text-slate-400">{item.completed_at || item.failed_at || item.created_at}</span>
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                    {item.filename || item.message || 'Waiting for Horizon to start the export...'}
                                </p>
                                {item.status === 'failed' && item.message && (
                                    <p className="mt-1 text-xs text-red-600">{item.message}</p>
                                )}
                            </div>
                            {item.download_url ? (
                                <a
                                    href={item.download_url}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                                >
                                    <Download size={13} strokeWidth={2} />
                                    Download
                                </a>
                            ) : (
                                <span className="text-xs text-slate-400">
                                    {item.status === 'failed' ? 'Retry from export buttons' : 'Download pending'}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Total volume"
                    value={fmtCurrency(summary.total_amount)}
                    sub={activeFilterLabel}
                    Icon={DollarSign}
                    tone="green"
                />
                <SummaryCard
                    label="Payments"
                    value={fmt(summary.payments_count)}
                    sub="Selected period"
                    Icon={CreditCard}
                />
                <SummaryCard
                    label="Active merchants"
                    value={fmt(summary.active_merchants)}
                    sub="With payments"
                    Icon={Users}
                    tone="slate"
                />
                <SummaryCard
                    label="Finished payments"
                    value={fmt(summary.paid_count)}
                    sub={`${fmt(summary.failed_count)} failed · ${fmt(summary.refunded_count)} refunded`}
                    Icon={Activity}
                    tone="green"
                />
            </div>

            <div className="mb-6">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Payment Trend</h2>
                            <p className="mt-0.5 text-sm text-slate-500">Volume over {activeFilterLabel}</p>
                        </div>
                        <CalendarDays size={18} strokeWidth={1.75} className="text-slate-400" />
                    </div>
                    <TrendBars trend={activity.trend || []} />
                </section>
            </div>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Merchant Payment Activity</h2>
                        <p className="mt-0.5 text-sm text-slate-500">Totals, status mix, and latest payment per merchant</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                        {range.from} to {range.to}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-2 font-medium">Merchant</th>
                                <th className="px-4 py-2 font-medium text-right">Total</th>
                                <th className="px-4 py-2 font-medium text-right">Payments</th>
                                <th className="px-4 py-2 font-medium">Status breakdown</th>
                                <th className="px-4 py-2 font-medium">Latest payment</th>
                                <th className="px-4 py-2 font-medium text-right">Latest amount</th>
                                <th className="px-4 py-2 font-medium">Provider</th>
                                <th className="px-4 py-2 font-medium">Latest status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {merchants.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-14 text-center text-sm text-slate-400">
                                        No merchants match this payment view.
                                    </td>
                                </tr>
                            ) : merchants.map((merchant) => (
                                <tr key={merchant.id} className="border-b hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2">
                                        <p className="font-medium text-slate-900">{merchant.name}</p>
                                        <p className="text-xs text-slate-500">{merchant.email}</p>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <p className="tabular-nums font-medium text-slate-900">
                                            {fmtCurrency(merchant.total_amount, merchant.currency)}
                                        </p>
                                        {merchant.currencies_count > 1 && (
                                            <p className="text-xs text-amber-600">Mixed currencies</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-slate-700">{fmt(merchant.payments_count)}</td>
                                    <td className="px-4 py-2">
                                        <StatusBreakdown counts={merchant.status_counts} />
                                    </td>
                                    <td className="px-4 py-2">
                                        {merchant.latest_payment ? (
                                            <>
                                                <p className="font-medium text-slate-900">{merchant.latest_payment.order_id}</p>
                                                <p className="text-xs text-gray-600">{fmtDate(merchant.latest_payment.created_at)}</p>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">No payment</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {merchant.latest_payment ? (
                                            <span className="tabular-nums font-medium text-slate-900">
                                                {fmtCurrency(merchant.latest_payment.amount, merchant.latest_payment.currency)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {merchant.latest_payment?.provider ? (
                                            <ProviderBrand alias={merchant.latest_payment.provider} variant="compact" />
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2">
                                        {merchant.latest_payment?.status ? (
                                            <Badge value={merchant.latest_payment.status} size="sm" />
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {merchants.length > 0 && (
                    <div className="border-t border-slate-100 px-5 py-3">
                        <Pagination links={activity.merchants?.links || []} />
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}
