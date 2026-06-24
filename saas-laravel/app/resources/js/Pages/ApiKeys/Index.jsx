import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { fmtDate } from '@/utils';
import {
    Key,
    RotateCcw,
    SlidersHorizontal,
} from 'lucide-react';

function StatusBadge({ value, label }) {
    const classes = {
        active: 'border-green-200 bg-green-50 text-green-700',
        inactive: 'border-slate-200 bg-slate-100 text-slate-600',
        test: 'border-blue-200 bg-blue-50 text-blue-700',
        live: 'border-violet-200 bg-violet-50 text-violet-700',
    }[value] || 'border-slate-200 bg-slate-100 text-slate-600';

    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>
            {label}
        </span>
    );
}

function ScopePills({ scopes, maxVisible = 3 }) {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const list = scopes?.length ? scopes : [t('apiKeys.table.defaultScope')];
    const visible = showAll ? list : list.slice(0, maxVisible);
    const overflow = list.length - maxVisible;

    return (
        <div className="flex flex-wrap gap-1">
            {visible.map((scope) => (
                <span key={scope} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">
                    {scope}
                </span>
            ))}
            {!showAll && overflow > 0 && (
                <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-100"
                >
                    {t('apiKeys.table.moreScopes', { count: overflow })}
                </button>
            )}
        </div>
    );
}

function PaginationLinks({ links = [] }) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="mt-5 flex justify-center gap-1">
            {links.map((link, index) => (
                <Link
                    key={`${link.label}-${index}`}
                    href={link.url ?? '#'}
                    preserveScroll
                    className={[
                        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors',
                        link.active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        !link.url ? 'pointer-events-none opacity-50' : '',
                    ].join(' ')}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

export default function ApiKeys({ keys, filters = {} }) {
    const { t } = useTranslation();
    const rows = keys.data ?? [];

    const filterForm = useForm({
        hash: filters.hash || '',
        environment: filters.environment || '',
        status: filters.status || '',
    });

    const submitFilters = (e) => {
        e.preventDefault();
        router.get(route('api-keys.index'), filterForm.data, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const resetFilters = () => {
        filterForm.setData({ hash: '', environment: '', status: '' });
        router.get(route('api-keys.index'), {}, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    const totalKeys = keys.total ?? rows.length;
    const activeKeys = rows.filter((key) => key.status === 'active').length;
    const testKeys = rows.filter((key) => key.environment === 'test').length;
    const liveKeys = rows.filter((key) => key.environment === 'live').length;

    return (
        <AuthenticatedLayout>
            <Head title={t('apiKeys.managementTitle')} />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">{t('apiKeys.managementTitle')}</h1>
                        <p className="mt-0.5 text-sm text-slate-500">{t('apiKeys.description')}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
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

                <form
                    onSubmit={submitFilters}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.25fr_0.75fr_0.75fr_auto_auto]"
                >
                    <input
                        type="text"
                        placeholder={t('apiKeys.filters.search')}
                        value={filterForm.data.hash}
                        onChange={(e) => filterForm.setData('hash', e.target.value)}
                        className="rounded-lg border-slate-200 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
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

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-base font-semibold text-slate-900">{t('apiKeys.table.title')}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-slate-200 text-sm">
                            <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 font-medium">{t('apiKeys.table.key')}</th>
                                    <th className="px-4 py-2 font-medium">{t('apiKeys.table.environment')}</th>
                                    <th className="px-4 py-2 font-medium">{t('apiKeys.table.scopes')}</th>
                                    <th className="px-4 py-2 font-medium">{t('apiKeys.table.status')}</th>
                                    <th className="px-4 py-2 font-medium">{t('apiKeys.table.lastRotated')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-14 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Key size={32} strokeWidth={1.25} />
                                                <span className="text-sm font-medium">{t('apiKeys.table.noKeys')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : rows.map((apiKey) => (
                                    <tr key={apiKey.id} className="align-top transition-colors hover:bg-slate-50/60">
                                        <td className="px-4 py-2">
                                            <span className="block font-medium text-slate-900">{apiKey.name || t('apiKeys.table.key')}</span>
                                            <code className="mt-0.5 block font-mono text-xs text-slate-500">{apiKey.masked_key || apiKey.hash}</code>
                                        </td>
                                        <td className="px-4 py-2">
                                            <StatusBadge value={apiKey.environment} label={t(`common.badges.${apiKey.environment}`)} />
                                        </td>
                                        <td className="max-w-xs px-4 py-2">
                                            <ScopePills scopes={apiKey.scopes || []} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <StatusBadge value={apiKey.status} label={t(`common.badges.${apiKey.status}`)} />
                                            {apiKey.revoked_at && (
                                                <span className="mt-1 block text-xs text-red-500">{t('apiKeys.table.revokedAt', { date: fmtDate(apiKey.revoked_at) })}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                                            {fmtDate(apiKey.last_rotated_at || apiKey.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <PaginationLinks links={keys.links} />
            </div>
        </AuthenticatedLayout>
    );
}
