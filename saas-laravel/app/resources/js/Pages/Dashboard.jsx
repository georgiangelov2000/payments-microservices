import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard({ summary }) {
    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Total payments */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <p className="text-sm text-gray-500">
                                Total Payments
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-gray-900">
                                {summary.total_payments}
                            </p>
                        </div>

                        {/* Payments this month */}
                        <div className="bg-white shadow-sm rounded-lg p-6">
                            <p className="text-sm text-gray-500">
                                Payments This Month
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-gray-900">
                                {summary.payments_this_month}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
