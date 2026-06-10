import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import Pagination from '@/Components/Pagination';
import { Plus, X, Copy, Check, RotateCcw, XCircle, SlidersHorizontal } from 'lucide-react';

const scopesMeta = [
    { id: 'payments:create', label: 'payments:create', descKey: 'apiKeys.scopes.paymentsCreate' },
    { id: 'payments:read',   label: 'payments:read',   descKey: 'apiKeys.scopes.paymentsRead' },
    { id: 'refunds:create',  label: 'refunds:create',  descKey: 'apiKeys.scopes.refundsCreate' },
    { id: 'customers:read',  label: 'customers:read',  descKey: 'apiKeys.scopes.customersRead' },
    { id: 'routing:test',    label: 'routing:test',    descKey: 'apiKeys.scopes.routingTest' },
    { id: 'webhooks:manage', label: 'webhooks:manage', descKey: 'apiKeys.scopes.webhooksManage' },
];

function Modal({ show, title, onClose, children }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400">
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function ScopePills({ scopes, maxVisible = 3 }) {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? scopes : scopes.slice(0, maxVisible);
    const overflow = scopes.length - maxVisible;
    return (
        <div className="flex flex-wrap gap-1">
            {visible.map((scope) => (
                <span key={scope} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-600">
                    {scope}
                </span>
            ))}
            {!showAll && overflow > 0 && (
                <button
                    onClick={() => setShowAll(true)}
                    className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-100"
                >
                    {t('apiKeys.table.moreScopes', { count: overflow })}
                </button>
            )}
        </div>
    );
}

export default function ApiKeysIndex({ apiKeys, merchants, generatedKey, filters = {} }) {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [showGeneratedKey, setShowGeneratedKey] = useState(!!generatedKey);
    const [copied, setCopied] = useState(false);

    const filterForm = useForm({
        search: filters.search || '',
        merchant_id: filters.merchant_id || '',
        environment: filters.environment || '',
        status: filters.status || '',
    });

    const form = useForm({
        merchant_id: merchants[0]?.id || '',
        name: '',
        environment: 'test',
        scopes: ['payments:create', 'payments:read'],
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.api-keys.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('name');
                setShowModal(false);
                setShowGeneratedKey(true);
            },
        });
    };

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('admin.api-keys.index'), filterForm.data, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const resetFilters = () => {
        filterForm.setData({
            search: '',
            merchant_id: '',
            environment: '',
            status: '',
        });
        router.get(route('admin.api-keys.index'), {}, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const toggleScope = (scope) => {
        form.setData('scopes', form.data.scopes.includes(scope)
            ? form.data.scopes.filter((s) => s !== scope)
            : [...form.data.scopes, scope]
        );
    };

    const copyKey = () => {
        if (generatedKey) {
            navigator.clipboard.writeText(generatedKey).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            });
        }
    };

    const rotateKey = (keyId) => {
        if (window.confirm(t('apiKeys.confirmRotate'))) {
            router.post(route('admin.api-keys.rotate', keyId), {}, { preserveScroll: true });
        }
    };

    const revokeKey = (keyId) => {
        if (window.confirm(t('apiKeys.confirmRevoke'))) {
            router.post(route('admin.api-keys.revoke', keyId), {}, { preserveScroll: true });
        }
    };

    const totalKeys = apiKeys.data.length;
    const activeKeys = apiKeys.data.filter((k) => k.status === 'active').length;
    const testKeys = apiKeys.data.filter((k) => k.environment === 'test').length;
    const liveKeys = apiKeys.data.filter((k) => k.environment === 'live').length;

    return (
        <AdminLayout title={t('apiKeys.title')}>
            <Head title={t('apiKeys.managementTitle')} />

            {/* Generated key banner */}
            {showGeneratedKey && generatedKey && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-900">{t('apiKeys.generatedTitle')}</p>
                            <p className="mt-0.5 text-xs text-green-700">{t('apiKeys.generatedDescription')}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <code className="flex-1 block rounded-lg border border-green-200 bg-white px-3 py-2 font-mono text-xs text-green-900 overflow-x-auto">
                                    {generatedKey}
                                </code>
                                <button
                                    onClick={copyKey}
                                    className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-50 transition-colors"
                                >
                                    {copied
                                        ? <><Check size={13} strokeWidth={2.5} />{t('common.actions.copied')}</>
                                        : <><Copy size={13} strokeWidth={2} />{t('common.actions.copy')}</>
                                    }
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowGeneratedKey(false)}
                            className="flex-shrink-0 rounded-lg p-1.5 hover:bg-green-100 text-green-600"
                        >
                            <X size={15} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            )}

            {/* Page header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">{t('apiKeys.managementTitle')}</h1>
                    <p className="mt-0.5 text-sm text-slate-500">{t('apiKeys.description')}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    {t('apiKeys.generate')}
                </button>
            </div>

            {/* Summary chips */}
            <div className="mb-6 flex flex-wrap gap-3">
                {[
                    { label: t('apiKeys.stats.total'), value: totalKeys, valueClass: 'text-slate-900' },
                    { label: t('apiKeys.stats.active'), value: activeKeys, valueClass: 'text-green-700' },
                    { label: t('apiKeys.stats.test'), value: testKeys, valueClass: 'text-slate-600' },
                    { label: t('apiKeys.stats.live'), value: liveKeys, valueClass: 'text-violet-700' },
                ].map(({ label, value, valueClass }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <span className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</span>
                        <span className="text-sm text-slate-500">{label}</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <form
                onSubmit={submitFilters}
                className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.25fr_1fr_0.75fr_0.75fr_auto_auto]"
            >
                <input
                    type="text"
                    placeholder={t('apiKeys.filters.search')}
                    value={filterForm.data.search}
                    onChange={(e) => filterForm.setData('search', e.target.value)}
                    className="rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <select
                    value={filterForm.data.merchant_id}
                    onChange={(e) => filterForm.setData('merchant_id', e.target.value)}
                    className="rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">{t('apiKeys.filters.allMerchants')}</option>
                    {merchants.map((merchant) => (
                        <option key={merchant.id} value={merchant.id}>
                            {merchant.name} ({merchant.email})
                        </option>
                    ))}
                </select>
                <select
                    value={filterForm.data.environment}
                    onChange={(e) => filterForm.setData('environment', e.target.value)}
                    className="rounded-lg border-slate-200 text-sm capitalize focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">{t('apiKeys.filters.allEnvironments')}</option>
                    <option value="test">{t('common.badges.test')}</option>
                    <option value="live">{t('common.badges.live')}</option>
                </select>
                <select
                    value={filterForm.data.status}
                    onChange={(e) => filterForm.setData('status', e.target.value)}
                    className="rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">{t('apiKeys.filters.allStatuses')}</option>
                    <option value="active">{t('common.badges.active')}</option>
                    <option value="inactive">{t('common.badges.inactive')}</option>
                </select>
                <button
                    type="submit"
                    disabled={filterForm.processing}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                    <SlidersHorizontal size={14} strokeWidth={2} />
                    {t('common.actions.filter')}
                </button>
                <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <RotateCcw size={14} strokeWidth={2} />
                    {t('common.actions.reset')}
                </button>
            </form>

            {/* Keys table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{t('apiKeys.table.title')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.key')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.merchant')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.environment')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.scopes')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.status')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.lastRotated')}</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{t('apiKeys.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {apiKeys.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-14 text-center">
                                        <div className="text-slate-400 text-sm">{t('apiKeys.table.noKeys')}</div>
                                    </td>
                                </tr>
                            ) : apiKeys.data.map((apiKey) => (
                                <tr key={apiKey.id} className="align-top hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-4">
                                        <span className="block font-medium text-slate-900">{apiKey.name || t('apiKeys.table.key')}</span>
                                        <code className="mt-0.5 block text-xs text-slate-500 font-mono">{apiKey.masked_key}</code>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="block font-medium text-slate-900">{apiKey.merchant?.name || 'Unknown'}</span>
                                        <span className="block text-xs text-slate-500">{apiKey.merchant?.email}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge value={apiKey.environment} label={t(`common.badges.${apiKey.environment}`)} size="sm" />
                                    </td>
                                    <td className="px-5 py-4 max-w-xs">
                                        <ScopePills scopes={apiKey.scopes || []} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge value={apiKey.status} label={t(`common.badges.${apiKey.status}`)} />
                                        {apiKey.revoked_at && (
                                            <span className="mt-1 block text-xs text-red-500">{t('apiKeys.table.revokedAt', { date: apiKey.revoked_at })}</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                                        {apiKey.last_rotated_at || apiKey.created_at}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => rotateKey(apiKey.id)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <RotateCcw size={12} strokeWidth={2} />
                                                {t('common.actions.rotate')}
                                            </button>
                                            {apiKey.status === 'active' && (
                                                <button
                                                    onClick={() => revokeKey(apiKey.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                                                >
                                                    <XCircle size={12} strokeWidth={2} />
                                                    {t('common.actions.revoke')}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination links={apiKeys.links} />

            {/* Generate Key Modal */}
            <Modal show={showModal} title={t('apiKeys.modal.title')} onClose={() => setShowModal(false)}>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('apiKeys.modal.merchant')}</label>
                        <select
                            className="w-full min-w-0 rounded-lg border border-slate-200 py-2 pl-3 pr-10 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={form.data.merchant_id}
                            onChange={(e) => form.setData('merchant_id', e.target.value)}
                            required
                        >
                            <option value="">{t('apiKeys.filters.allMerchants')}</option>
                            {merchants.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                            ))}
                        </select>
                        {form.errors.merchant_id && (
                            <p className="mt-1 text-xs text-red-600">{form.errors.merchant_id}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('apiKeys.modal.name')}</label>
                        <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={t('apiKeys.modal.namePlaceholder')}
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('apiKeys.modal.environment')}</label>
                        <div className="flex gap-2">
                            {['test', 'live'].map((env) => (
                                <button
                                    key={env}
                                    type="button"
                                    onClick={() => form.setData('environment', env)}
                                    className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${
                                        form.data.environment === env
                                            ? 'border-indigo-600 bg-indigo-600 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {t(`common.badges.${env}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('apiKeys.modal.scopes')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {scopesMeta.map(({ id, label, descKey }) => (
                                <label
                                    key={id}
                                    className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors ${
                                        form.data.scopes.includes(id)
                                            ? 'border-indigo-300 bg-indigo-50'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={form.data.scopes.includes(id)}
                                            onChange={() => toggleScope(id)}
                                        />
                                        <span className="text-xs font-mono font-medium text-slate-800">{label}</span>
                                    </div>
                                    <span className="ml-5 text-xs text-slate-500">{t(descKey)}</span>
                                </label>
                            ))}
                        </div>
                        {form.errors.scopes && (
                            <p className="mt-1 text-xs text-red-600">{form.errors.scopes}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            {t('common.actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.merchant_id}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                        >
                            {form.processing ? `${t('common.actions.generate', { defaultValue: 'Generate' })}...` : t('apiKeys.modal.create')}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
