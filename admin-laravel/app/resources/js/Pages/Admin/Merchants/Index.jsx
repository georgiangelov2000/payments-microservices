import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import ProviderBrand from '@/Components/ProviderBrand';
import { fmtDate } from '@/utils';
import { Plus, Search, X, Pencil, UserPlus } from 'lucide-react';

const providerStatuses = ['pending', 'active', 'validated', 'disabled'];

function Modal({ show, title, size = 'md', onClose, children }) {
    if (!show) return null;
    const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${widths[size]} rounded-2xl bg-white shadow-2xl`}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function ProviderCredentialsList({ credentials, onStatusChange }) {
    const [showAll, setShowAll] = useState(false);
    const visible  = showAll ? credentials : credentials.slice(0, 2);
    const overflow = credentials.length - 2;

    if (credentials.length === 0) {
        return <span className="text-xs text-slate-400 italic">No providers assigned</span>;
    }

    return (
        <div className="flex flex-col gap-1.5">
            {visible.map((cred) => (
                <div key={cred.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    <ProviderBrand alias={cred.provider_alias} label={cred.provider_name} variant="compact" className="max-w-[130px]" />
                    <Badge value={cred.environment} size="sm" />
                    <Badge value={cred.status} size="sm" />
                </div>
            ))}
            {!showAll && overflow > 0 && (
                <button className="text-xs text-indigo-600 hover:underline text-left" onClick={() => setShowAll(true)}>
                    +{overflow} more
                </button>
            )}
        </div>
    );
}

export default function MerchantsIndex({ merchants, availableProviders, filters = {} }) {
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignMerchantId, setAssignMerchantId] = useState(merchants.data[0]?.id || '');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const providerForm = useForm({
        merchant_id:  assignMerchantId,
        provider_id:  availableProviders[0]?.id || '',
        environment:  'test',
        display_name: '',
        public_key:   '',
        secret_value: '',
        status:       'pending',
    });

    const openAssign = (merchantId = null) => {
        const id = merchantId ?? merchants.data[0]?.id ?? '';
        setAssignMerchantId(id);
        providerForm.setData({ ...providerForm.data, merchant_id: id });
        setShowAssignModal(true);
    };

    const assignProvider = (e) => {
        e.preventDefault();
        providerForm.post(route('admin.merchants.providers.store', providerForm.data.merchant_id), {
            preserveScroll: true,
            onSuccess: () => {
                providerForm.reset('display_name', 'public_key', 'secret_value');
                setShowAssignModal(false);
            },
        });
    };

    const updateProviderStatus = (cred, status) => {
        router.put(route('admin.merchant-provider-credentials.update', cred.id), { status }, { preserveScroll: true });
    };

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(route('admin.merchants.index'), {
                search: search.trim() || undefined,
                status: status || undefined,
            }, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search, status]);

    const activeMerchants = merchants.data.filter((m) => m.status === 'active').length;

    return (
        <AdminLayout title="Merchants">
            <Head title="Merchant Management" />

            {/* Page header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Merchant Management</h1>
                    <p className="mt-0.5 text-sm text-slate-500">Onboard and manage payment merchants</p>
                </div>
                <Link
                    href={route('admin.merchants.create')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    Add Merchant
                </Link>
            </div>

            {/* Stats row */}
            <div className="mb-6 flex flex-wrap gap-3">
                {[
                    { label: 'Total merchants',     value: merchants.data.length, color: 'text-slate-900' },
                    { label: 'Active merchants',    value: activeMerchants,       color: 'text-green-700' },
                    { label: 'Providers available', value: availableProviders.length, color: 'text-indigo-700' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
                        <span className="text-sm text-slate-500">{label}</span>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">All Merchants</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search size={14} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search merchants..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-sm placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="min-w-40 rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-10 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button
                            onClick={() => openAssign(null)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Assign Provider
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-gray-50 border-b text-xs text-left text-gray-500 uppercase tracking-wide">
                            <tr>
                                <th className="px-4 py-2 font-medium">Merchant</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 font-medium">Providers</th>
                                <th className="px-4 py-2 font-medium">Activity</th>
                                <th className="px-4 py-2 font-medium">Since</th>
                                <th className="px-4 py-2 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {merchants.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-14 text-center">
                                        <p className="text-sm text-slate-400">
                                            {search ? 'No merchants match your search.' : 'No merchants yet.'}
                                        </p>
                                        {!search && (
                                            <Link href={route('admin.merchants.create')} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                                Add your first merchant →
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ) : merchants.data.map((merchant) => (
                                <tr key={merchant.id} className="align-top hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-2">
                                        <span className="block font-medium text-slate-900">{merchant.name}</span>
                                        <span className="block text-xs text-slate-500">{merchant.email}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Badge value={merchant.status} />
                                    </td>
                                    <td className="px-4 py-2 min-w-[200px]">
                                        <ProviderCredentialsList
                                            credentials={merchant.provider_credentials}
                                            onStatusChange={updateProviderStatus}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{merchant.payments_count} payments</span>
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{merchant.api_keys_count} keys</span>
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{merchant.subscriptions_count} subs</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(merchant.created_at)}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={route('admin.merchants.edit', merchant.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Pencil size={11} strokeWidth={2} />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => openAssign(merchant.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                                            >
                                                <UserPlus size={11} strokeWidth={2} />
                                                Provider
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination links={merchants.links} />

            {/* Assign Provider Modal (still kept here for quick access) */}
            <Modal show={showAssignModal} title="Assign Payment Provider" onClose={() => setShowAssignModal(false)}>
                <form onSubmit={assignProvider} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Merchant</label>
                        <select
                            className="w-full min-w-0 rounded-xl border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            value={providerForm.data.merchant_id}
                            onChange={(e) => providerForm.setData('merchant_id', e.target.value)}
                        >
                            {merchants.data.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.email}</option>)}
                        </select>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                            <select className="w-full min-w-0 rounded-xl border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                value={providerForm.data.provider_id} onChange={(e) => providerForm.setData('provider_id', e.target.value)}>
                                {availableProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Environment</label>
                            <select className="w-full min-w-0 rounded-xl border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                value={providerForm.data.environment} onChange={(e) => providerForm.setData('environment', e.target.value)}>
                                <option value="test">Test</option>
                                <option value="live">Live</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Display Name <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. Stripe Production" value={providerForm.data.display_name}
                            onChange={(e) => providerForm.setData('display_name', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Public Key</label>
                        <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="pk_..." value={providerForm.data.public_key}
                            onChange={(e) => providerForm.setData('public_key', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key</label>
                        <input type="password" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            placeholder="sk_..." value={providerForm.data.secret_value}
                            onChange={(e) => providerForm.setData('secret_value', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Initial Status</label>
                        <select className="w-full min-w-0 rounded-xl border border-slate-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            value={providerForm.data.status} onChange={(e) => providerForm.setData('status', e.target.value)}>
                            {providerStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={() => setShowAssignModal(false)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={providerForm.processing}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                            {providerForm.processing ? 'Assigning…' : 'Assign Provider'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
