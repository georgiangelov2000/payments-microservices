import { Fragment, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import ProviderBrand from '@/Components/ProviderBrand';
import { fmtCurrency, fmtDate } from '@/utils';
import { ChevronDown, ListTree, Search, X, SlidersHorizontal, ReceiptText } from 'lucide-react';

function cleanLogMessage(message) {
    return (message || '').replace(/^\[[^\]]+\]\s*/, '');
}

const STATUS_OPTIONS = ['', 'pending', 'finished', 'failed'];

export default function PaymentsIndex({ payments, filters = {} }) {
    const [search, setSearch]   = useState(filters.search   || '');
    const [status, setStatus]   = useState(filters.status   || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo]   = useState(filters.date_to   || '');
    const [expandedRows, setExpandedRows] = useState({});

    function applyFilters(e) {
        e.preventDefault();
        const params = {};
        if (search)   params.search    = search;
        if (status)   params.status    = status;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo)   params.date_to   = dateTo;

        router.get(route('admin.payments.index'), params, {
            preserveScroll: true,
            replace: true,
        });
    }

    function clearFilters() {
        setSearch('');
        setStatus('');
        setDateFrom('');
        setDateTo('');
        router.get(route('admin.payments.index'), {}, {
            preserveScroll: true,
            replace: true,
        });
    }

    const data = payments.data || [];

    function toggleRow(paymentId) {
        setExpandedRows((current) => ({
            ...current,
            [paymentId]: !current[paymentId],
        }));
    }

    // Summary counts from current page data
    const counts = data.reduce(
        (acc, p) => {
            acc.total++;
            const s = (p.status || '').toLowerCase();
            if (s === 'finished') acc.finished++;
            else if (s === 'pending') acc.pending++;
            else if (s === 'failed') acc.failed++;
            return acc;
        },
        { total: 0, finished: 0, pending: 0, failed: 0 },
    );

    // Pagination info
    const meta   = payments.meta || {};
    const from   = meta.from   ?? (data.length ? 1 : 0);
    const to     = meta.to     ?? data.length;
    const total  = meta.total  ?? data.length;

    return (
        <AdminLayout title="Payments">
            <Head title="Payments" />

            {/* Page heading */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">Payment Operations</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Browse, search, and filter all payment transactions.
                    </p>
                </div>
                <Link
                    href={route('admin.payments.merchants')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ReceiptText size={15} strokeWidth={2} />
                    Merchant payments
                </Link>
            </div>

            {/* Filter bar */}
            <form
                onSubmit={applyFilters}
                className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
                <div className="flex flex-wrap items-end gap-3">
                    {/* Search */}
                    <div className="min-w-0 flex-1" style={{ minWidth: '200px' }}>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Order ID or merchant…"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="min-w-40 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            {STATUS_OPTIONS.filter(Boolean).map((s) => (
                                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date from */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            From
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Date to */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            To
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
                        >
                            <SlidersHorizontal size={14} strokeWidth={2} />
                            Apply Filters
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 transition-colors"
                        >
                            <X size={14} strokeWidth={2} />
                            Clear
                        </button>
                    </div>
                </div>
            </form>

            {/* Summary row */}
            <div className="mb-4 flex flex-wrap gap-3">
                {[
                    { label: 'Shown', value: counts.total, color: 'text-slate-700' },
                    { label: 'Finished', value: counts.finished, color: 'text-green-600' },
                    { label: 'Pending', value: counts.pending, color: 'text-amber-600' },
                    { label: 'Failed', value: counts.failed, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
                        <span className={`text-sm font-bold ${color}`}>{value}</span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">Logs</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Merchant</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Provider</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-28">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Provider Status</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-40">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-14 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Search size={32} strokeWidth={1.25} />
                                            <span className="text-sm font-medium">No payments match your filters</span>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="mt-1 text-xs text-indigo-600 hover:underline"
                                            >
                                                Clear filters
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.map((payment) => {
                                    const logs = payment.logs || [];
                                    const attempts = payment.routing_attempts || [];
                                    const isExpanded = Boolean(expandedRows[payment.id]);
                                    const hasDetails = logs.length > 0 || attempts.length > 0;

                                    return (
                                        <Fragment key={payment.id}>
                                            <tr className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRow(payment.id)}
                                                        disabled={!hasDetails}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                        title={hasDetails ? 'Show payment logs' : 'No logs available'}
                                                    >
                                                        <ChevronDown
                                                            size={16}
                                                            strokeWidth={2}
                                                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className="font-mono text-sm font-medium text-indigo-700">
                                                        {payment.order_id}
                                                    </span>
                                                    {hasDetails && (
                                                        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                            <ListTree size={11} strokeWidth={2} />
                                                            {logs.length} logs · {attempts.length} attempts
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className="block text-sm font-medium text-slate-900">
                                                        {payment.merchant?.name || 'Unknown'}
                                                    </span>
                                                    {payment.merchant?.email && (
                                                        <span className="block text-xs text-slate-500 mt-0.5">
                                                            {payment.merchant.email}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                            {payment.provider ? (
                                                <ProviderBrand alias={payment.provider} variant="compact" />
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className="block text-sm font-semibold text-slate-900">
                                                        {payment.currency || 'USD'} {fmtCurrency(payment.price)}
                                                    </span>
                                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                                                        {[payment.channel, payment.country, payment.locale].filter(Boolean).join(' · ') || 'No context'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <Badge value={payment.status} />
                                                </td>
                                                <td className="px-6 py-3.5 text-xs text-slate-500">
                                                    {payment.provider_status || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-500">
                                                    {fmtDate(payment.created_at)}
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="bg-slate-50/70">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
                                                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                                    <h3 className="text-sm font-semibold text-slate-900">Payment timeline</h3>
                                                                    <span className="text-xs font-medium text-slate-400">{logs.length} events</span>
                                                                </div>
                                                                {logs.length === 0 ? (
                                                                    <p className="text-sm text-slate-500">No payment logs recorded yet.</p>
                                                                ) : (
                                                                    <ol className="space-y-3">
                                                                        {logs.map((log) => (
                                                                            <li key={log.id} className="flex gap-3">
                                                                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <p className="text-sm font-semibold text-slate-800">{log.event_type || 'Log event'}</p>
                                                                                        <Badge value={(log.status || '').toLowerCase()} />
                                                                                    </div>
                                                                                    <p className="mt-1 break-words text-sm text-slate-600">{cleanLogMessage(log.message)}</p>
                                                                                    <p className="mt-1 text-xs text-slate-400">{fmtDate(log.created_at)}</p>
                                                                                </div>
                                                                            </li>
                                                                        ))}
                                                                    </ol>
                                                                )}
                                                            </div>

                                                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                                    <h3 className="text-sm font-semibold text-slate-900">Provider attempts</h3>
                                                                    <span className="text-xs font-medium text-slate-400">{attempts.length} attempts</span>
                                                                </div>
                                                                {attempts.length === 0 ? (
                                                                    <p className="text-sm text-slate-500">No provider attempts recorded yet.</p>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {attempts.map((attempt) => (
                                                                            <div key={attempt.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                                                                            #{attempt.attempt_number}
                                                                                        </span>
                                                                                        <ProviderBrand alias={attempt.provider_alias} variant="compact" />
                                                                                    </div>
                                                                                    <Badge value={attempt.status} />
                                                                                </div>
                                                                                {(attempt.error_code || attempt.error_message) && (
                                                                                    <div className="mt-2 rounded-md border border-red-100 bg-red-50 px-3 py-2">
                                                                                        {attempt.error_code && (
                                                                                            <p className="text-xs font-semibold text-red-700">Error {attempt.error_code}</p>
                                                                                        )}
                                                                                        {attempt.error_message && (
                                                                                            <p className="mt-1 break-words text-xs leading-5 text-red-700">{attempt.error_message}</p>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                                                                                    <span>{fmtDate(attempt.created_at)}</span>
                                                                                    {attempt.latency_ms !== null && attempt.latency_ms !== undefined && (
                                                                                        <span>{attempt.latency_ms}ms</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {data.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                        <p className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of <span className="font-medium text-slate-700">{total}</span> payments
                        </p>
                        <Pagination links={payments.links || []} />
                    </div>
                )}
            </section>
        </AdminLayout>
    );
}
