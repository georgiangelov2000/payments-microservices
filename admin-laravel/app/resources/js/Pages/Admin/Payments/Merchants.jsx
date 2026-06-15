import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import ProviderBrand from '@/Components/ProviderBrand';
import { fmt, fmtCurrency, fmtDate } from '@/utils';
import {
    Activity,
    CalendarDays,
    CreditCard,
    DollarSign,
    Search,
    SlidersHorizontal,
    Users,
    X,
} from 'lucide-react';

const STATUS_OPTIONS = ['', 'finished', 'pending', 'failed', 'refunded', 'processing', 'cancelled', 'disputed', 'expired'];

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

function TrendBars({ trend }) {
    const max = Math.max(...trend.map((row) => Number(row.total_amount || 0)), 1);

    if (!trend.length) {
        return (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                No payment trend data for this period.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex h-36 min-w-full items-end gap-1.5" style={{ minWidth: `${trend.length * 36}px` }}>
                {trend.map((row) => {
                    const amount = Number(row.total_amount || 0);
                    const height = Math.max((amount / max) * 100, 5);

                    return (
                        <div key={row.period} className="group relative flex flex-1 flex-col items-center justify-end">
                            <div
                                className="w-full rounded-t bg-indigo-400 transition-colors group-hover:bg-indigo-600"
                                style={{ height: `${height}%` }}
                            />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white shadow-lg group-hover:block">
                                <span className="block whitespace-nowrap">{fmtCurrency(amount)}</span>
                                <span className="block whitespace-nowrap text-slate-300">{fmt(row.payments_count)} payments</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-400">
                <span className="truncate">{trend[0]?.period}</span>
                <span className="truncate text-right">{trend[trend.length - 1]?.period}</span>
            </div>
        </div>
    );
}

function StatusBreakdown({ counts }) {
    const items = [
        ['finished', counts?.paid || 0],
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

export default function MerchantPayments({ activity, filters = {} }) {
    const [period, setPeriod] = useState(filters.period || 'monthly');
    const [month, setMonth] = useState(filters.month || currentMonth());
    const [year, setYear] = useState(String(filters.year || currentYear()));
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const merchants = activity.merchants?.data || [];
    const summary = activity.summary || {};
    const range = activity.range || {};

    const activeFilterLabel = useMemo(() => {
        if (period === 'yearly') return year;
        if (period === 'custom') return range.label || 'Custom range';
        return range.label || month;
    }, [period, year, month, range.label]);

    function applyFilters(e) {
        e.preventDefault();

        const params = { period };
        if (period === 'monthly') params.month = month;
        if (period === 'yearly') params.year = year;
        if (period === 'custom') {
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
        }
        if (search.trim()) params.search = search.trim();
        if (status) params.status = status;

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
                <Link
                    href={route('admin.payments.index')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <CreditCard size={15} strokeWidth={2} />
                    Transaction list
                </Link>
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
