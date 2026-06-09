import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import ProviderBrand from '@/Components/ProviderBrand';
import { Users, CreditCard, DollarSign, Key } from 'lucide-react';

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

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function fmt(value) {
    return Number(value || 0).toLocaleString();
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
        hour: '2-digit',
        minute: '2-digit',
    });
}


// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, prefix, icon, iconBg, accentBar, routeName }) {
    return (
        <Link
            href={route(routeName)}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-150 hover:shadow-md hover:border-slate-300"
        >
            <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
            <div className="flex items-start justify-between pl-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {prefix && <span className="text-xl text-slate-400 mr-0.5">{prefix}</span>}
                        {value}
                    </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    {icon}
                </div>
            </div>
        </Link>
    );
}

// ── Secondary Stat Card ───────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
    const accentMap = {
        green: 'text-green-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
        blue: 'text-blue-600',
        slate: 'text-slate-700',
    };
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-1.5 text-2xl font-bold tracking-tight ${accentMap[accent] || 'text-slate-900'}`}>
                {value}
            </p>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Dashboard({ metrics, recentPayments }) {
    return (
        <AdminLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* Greeting */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">
                    {getGreeting()} — Platform Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    Here's what's happening across your payment infrastructure.
                </p>
            </div>

            {/* Top KPI row — 4 large cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="Total Merchants"
                    value={fmt(metrics.merchants)}
                    icon={<Users size={20} strokeWidth={1.75} className="text-indigo-600" />}
                    iconBg="bg-indigo-50"
                    accentBar="bg-indigo-500"
                    routeName="admin.merchants.index"
                />
                <KpiCard
                    label="Total Payments"
                    value={fmt(metrics.payments)}
                    icon={<CreditCard size={20} strokeWidth={1.75} className="text-blue-600" />}
                    iconBg="bg-blue-50"
                    accentBar="bg-blue-500"
                    routeName="admin.payments.index"
                />
                <KpiCard
                    label="Payment Volume"
                    value={fmtCurrency(metrics.paymentVolume)}
                    prefix="$"
                    icon={<DollarSign size={20} strokeWidth={1.75} className="text-green-600" />}
                    iconBg="bg-green-50"
                    accentBar="bg-green-500"
                    routeName="admin.payments.index"
                />
                <KpiCard
                    label="Active API Keys"
                    value={fmt(metrics.activeApiKeys)}
                    icon={<Key size={20} strokeWidth={1.75} className="text-violet-600" />}
                    iconBg="bg-violet-50"
                    accentBar="bg-violet-500"
                    routeName="admin.api-keys.index"
                />
            </div>

            {/* Secondary metrics — 8 smaller cards */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Active Merchants"    value={fmt(metrics.activeMerchants)}    accent="green" />
                <StatCard label="Pending Payments"    value={fmt(metrics.pendingPayments)}    accent="amber" />
                <StatCard label="Finished Payments"   value={fmt(metrics.finishedPayments)}   accent="green" />
                <StatCard label="Failed Payments"     value={fmt(metrics.failedPayments)}     accent="red"   />
                <StatCard label="Routing Workflows"   value={fmt(metrics.routingWorkflows)}   accent="slate" />
                <StatCard label="Published Workflows" value={fmt(metrics.publishedWorkflows)} accent="green" />
                <StatCard label="Unhealthy Providers" value={fmt(metrics.unhealthyProviders)} accent="red"   />
                <StatCard label="Routing Failovers"   value={fmt(metrics.routingFailovers)}   accent="amber" />
            </div>

            {/* Recent transactions */}
            <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-xl font-semibold text-slate-900">Recent Transactions</h2>
                    <Link
                        href={route('admin.payments.index')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                        View all →
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Order ID', 'Merchant', 'Provider', 'Amount', 'Status', 'Created'].map((col) => (
                                    <th
                                        key={col}
                                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-14 text-center">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <CreditCard size={32} strokeWidth={1.25} />
                                            <span className="text-sm font-medium">No transactions recorded yet</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                recentPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <span className="font-mono text-sm font-medium text-slate-800">
                                                {payment.order_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-sm text-slate-700">
                                            {payment.merchant?.name || payment.merchant || 'Unknown'}
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
                                            {payment.channel && (
                                                <span className="block text-[11px] font-medium text-slate-400">
                                                    {payment.channel}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <Badge value={payment.status} />
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
            </section>
        </AdminLayout>
    );
}
