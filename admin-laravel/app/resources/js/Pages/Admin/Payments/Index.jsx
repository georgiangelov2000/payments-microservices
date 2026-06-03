import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import Pagination from '@/Components/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { Search, X, SlidersHorizontal } from 'lucide-react';

function Badge({ value }) {
    const colors = {
        active: 'bg-green-100 text-green-700 border-green-200',
        validated: 'bg-green-100 text-green-700 border-green-200',
        healthy: 'bg-green-100 text-green-700 border-green-200',
        succeeded: 'bg-green-100 text-green-700 border-green-200',
        finished: 'bg-green-100 text-green-700 border-green-200',
        published: 'bg-green-100 text-green-700 border-green-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        degraded: 'bg-amber-100 text-amber-700 border-amber-200',
        inactive: 'bg-slate-100 text-slate-600 border-slate-200',
        disabled: 'bg-slate-100 text-slate-600 border-slate-200',
        draft: 'bg-blue-100 text-blue-700 border-blue-200',
        suspended: 'bg-red-100 text-red-700 border-red-200',
        failed: 'bg-red-100 text-red-700 border-red-200',
        unhealthy: 'bg-red-100 text-red-700 border-red-200',
        timeout: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${colors[value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {value || 'unknown'}
        </span>
    );
}

function fmtCurrency(value) {
    return Number(value || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const STATUS_OPTIONS = ['', 'pending', 'finished', 'failed'];

export default function PaymentsIndex({ payments, filters = {} }) {
    const [search, setSearch]   = useState(filters.search   || '');
    const [status, setStatus]   = useState(filters.status   || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo]   = useState(filters.date_to   || '');

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
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Payment Operations</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Browse, search, and filter all payment transactions.
                </p>
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
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                    <td colSpan={7} className="px-6 py-14 text-center">
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
                                data.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <span className="font-mono text-sm font-medium text-indigo-700">
                                                {payment.order_id}
                                            </span>
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
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    {payment.provider}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">
                                            ${fmtCurrency(payment.amount)}
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
                                ))
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
