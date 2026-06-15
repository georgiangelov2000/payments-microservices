import { Head } from '@inertiajs/react';
import Pagination from '@/Components/Pagination';
import AdminLayout from '@/Layouts/AdminLayout';
import { fmtCurrency, fmtCount } from '@/utils';

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan }) {
    const txFee = `${Number(plan.transaction_fee_percent || 0).toFixed(2)}% + $${fmtCurrency(plan.transaction_fee_fixed)}`;
    const merchantCount = plan.user_subscriptions_count ?? 0;

    return (
        <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-150 hover:shadow-md">
            {/* Card header */}
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-slate-900 leading-tight">{plan.name}</h3>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {plan.code}
                    </span>
                </div>

                {/* Hero price */}
                <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-bold tracking-tight text-slate-900">
                        ${fmtCurrency(plan.monthly_fee)}
                    </span>
                    <span className="mb-1 text-sm text-slate-500">/mo</span>
                </div>
            </div>

            <div className="border-t border-slate-100 mx-6" />

            {/* Plan details */}
            <div className="flex flex-col gap-3 px-6 py-4 flex-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Transaction fee</span>
                    <span className="font-medium text-slate-900">{txFee}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Included transactions</span>
                    <span className="font-medium text-slate-900">
                        {fmtCount(plan.included_transactions)}/mo
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Active merchants</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        merchantCount > 0
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                        {merchantCount} {merchantCount === 1 ? 'merchant' : 'merchants'}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubscriptionsIndex({ subscriptions }) {
    const plans = subscriptions.data || [];
    const hasMultiplePages = (subscriptions.links || []).length > 3;

    return (
        <AdminLayout title="Subscriptions">
            <Head title="Billing Plans" />

            {/* Page heading */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Billing Plans</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Manage pricing tiers and monitor merchant subscriptions.
                </p>
            </div>

            {/* Plan cards — 3-column grid */}
            {plans.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                            strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <span className="text-sm font-medium">No billing plans configured</span>
                    </div>
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                    ))}
                </div>
            )}

            {/* Summary comparison table */}
            {plans.length > 0 && (
                <section className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h3 className="text-xl font-semibold text-slate-900">Plan Comparison</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Side-by-side view of all pricing tiers and subscriber counts.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                                <tr>
                                    {['Plan', 'Code', 'Monthly Fee', 'Transaction Fee', 'Included Txns', 'Merchants'].map((col) => (
                                        <th
                                            key={col}
                                            className="px-4 py-2 font-medium"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {plans.map((plan) => (
                                    <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2">
                                            <span className="font-medium text-slate-900">{plan.name}</span>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                {plan.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-medium text-slate-900">
                                            ${fmtCurrency(plan.monthly_fee)}
                                        </td>
                                        <td className="px-4 py-2 text-slate-700">
                                            {Number(plan.transaction_fee_percent || 0).toFixed(2)}%
                                            {' + '}
                                            ${fmtCurrency(plan.transaction_fee_fixed)}
                                        </td>
                                        <td className="px-4 py-2 text-slate-700">
                                            {fmtCount(plan.included_transactions)}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                                (plan.user_subscriptions_count ?? 0) > 0
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {plan.user_subscriptions_count ?? 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Pagination */}
            {hasMultiplePages && (
                <div className="mt-5">
                    <Pagination links={subscriptions.links} />
                </div>
            )}
        </AdminLayout>
    );
}
