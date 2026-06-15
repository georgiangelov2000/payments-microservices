import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import ProviderBrand from '@/Components/ProviderBrand';
import { fmt, fmtCurrency, fmtDate } from '@/utils';
import { Users, CreditCard, DollarSign, Key } from 'lucide-react';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                            <tr>
                                {['Order ID', 'Merchant', 'Provider', 'Amount', 'Status', 'Created'].map((col) => (
                                    <th
                                        key={col}
                                        className="px-4 py-2 font-medium"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
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
                                    <tr key={payment.id} className="border-b hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2">
                                            <span className="font-mono text-xs text-slate-500">
                                                {payment.order_id}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-medium text-slate-900">
                                            {payment.merchant?.name || payment.merchant || 'Unknown'}
                                        </td>
                                        <td className="px-4 py-2">
                                            {payment.provider ? (
                                                <ProviderBrand alias={payment.provider} variant="compact" />
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="block tabular-nums font-medium text-slate-900">
                                                {payment.currency || 'USD'} {fmtCurrency(payment.price)}
                                            </span>
                                            {payment.channel && (
                                                <span className="block text-[11px] font-medium text-slate-400">
                                                    {payment.channel}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge value={payment.status} />
                                        </td>
                                        <td className="px-4 py-2 text-xs text-gray-600">
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
