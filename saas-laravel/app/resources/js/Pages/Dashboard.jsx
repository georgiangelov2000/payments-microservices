import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { CreditCard, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';

const STAT_CONFIG = [
    {
        key: 'total_payments',
        label: 'Total Payments',
        Icon: CreditCard,
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
        valueColor: 'text-slate-900',
        accent: 'bg-indigo-500',
    },
    {
        key: 'payments_this_month',
        label: 'Payments This Month',
        Icon: TrendingUp,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        valueColor: 'text-slate-900',
        accent: 'bg-blue-500',
    },
    {
        key: 'payments_finished',
        label: 'Successful Payments',
        Icon: CheckCircle2,
        iconBg: 'bg-green-50',
        iconColor: 'text-green-600',
        valueColor: 'text-green-600',
        accent: 'bg-green-500',
    },
    {
        key: 'payments_pending',
        label: 'Pending Payments',
        Icon: Clock,
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        valueColor: 'text-amber-600',
        accent: 'bg-amber-500',
    },
    {
        key: 'payments_failed',
        label: 'Failed Payments',
        Icon: XCircle,
        iconBg: 'bg-red-50',
        iconColor: 'text-red-600',
        valueColor: 'text-red-600',
        accent: 'bg-red-500',
    },
];

function StatCard({ label, value, Icon, iconBg, iconColor, valueColor, accent }) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
            <div className="flex items-start justify-between pl-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                    </p>
                    <p className={`mt-2 text-3xl font-bold tracking-tight ${valueColor}`}>
                        {value ?? 0}
                    </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon size={20} strokeWidth={1.75} className={iconColor} />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({ summary }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {STAT_CONFIG.map(({ key, ...props }) => (
                            <StatCard key={key} value={summary?.[key]} {...props} />
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
