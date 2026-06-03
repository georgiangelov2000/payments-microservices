import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import Pagination from '@/Components/Pagination';
import { Plus, X, Copy, Check, RotateCcw, XCircle } from 'lucide-react';

const scopesMeta = [
    { id: 'payments:create', label: 'payments:create', desc: 'Create payment sessions' },
    { id: 'payments:read',   label: 'payments:read',   desc: 'Read payment data' },
    { id: 'refunds:create',  label: 'refunds:create',  desc: 'Issue refunds' },
    { id: 'customers:read',  label: 'customers:read',  desc: 'Read customer profiles' },
    { id: 'routing:test',    label: 'routing:test',    desc: 'Test routing rules' },
    { id: 'webhooks:manage', label: 'webhooks:manage', desc: 'Configure webhooks' },
];

function Badge({ value, size = 'md' }) {
    const colors = {
        active: 'bg-green-100 text-green-700 border-green-200',
        validated: 'bg-green-100 text-green-700 border-green-200',
        healthy: 'bg-green-100 text-green-700 border-green-200',
        succeeded: 'bg-green-100 text-green-700 border-green-200',
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
        test: 'bg-slate-100 text-slate-600 border-slate-200',
        live: 'bg-violet-100 text-violet-700 border-violet-200',
        sandbox: 'bg-slate-100 text-slate-600 border-slate-200',
        production: 'bg-violet-100 text-violet-700 border-violet-200',
        revoked: 'bg-red-100 text-red-700 border-red-200',
    };
    const sz = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';
    return (
        <span className={`inline-flex items-center rounded-full border font-medium capitalize ${sz} ${colors[value] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {value || 'unknown'}
        </span>
    );
}

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
                    +{overflow} more
                </button>
            )}
        </div>
    );
}

export default function ApiKeysIndex({ apiKeys, merchants, generatedKey }) {
    const [showModal, setShowModal] = useState(false);
    const [showGeneratedKey, setShowGeneratedKey] = useState(!!generatedKey);
    const [copied, setCopied] = useState(false);

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
        if (window.confirm('Rotate this API key? The current key will be invalidated immediately.')) {
            router.post(route('admin.api-keys.rotate', keyId), {}, { preserveScroll: true });
        }
    };

    const revokeKey = (keyId) => {
        if (window.confirm('Revoke this API key? This action cannot be undone.')) {
            router.post(route('admin.api-keys.revoke', keyId), {}, { preserveScroll: true });
        }
    };

    const totalKeys = apiKeys.data.length;
    const activeKeys = apiKeys.data.filter((k) => k.status === 'active').length;
    const testKeys = apiKeys.data.filter((k) => k.environment === 'test').length;
    const liveKeys = apiKeys.data.filter((k) => k.environment === 'live').length;

    return (
        <AdminLayout title="API Keys">
            <Head title="API Key Management" />

            {/* Generated key banner */}
            {showGeneratedKey && generatedKey && (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-green-900">New API Key Generated</p>
                            <p className="mt-0.5 text-xs text-green-700">Copy this key now — it will not be shown again.</p>
                            <div className="mt-3 flex items-center gap-2">
                                <code className="flex-1 block rounded-lg border border-green-200 bg-white px-3 py-2 font-mono text-xs text-green-900 overflow-x-auto">
                                    {generatedKey}
                                </code>
                                <button
                                    onClick={copyKey}
                                    className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-50 transition-colors"
                                >
                                    {copied
                                        ? <><Check size={13} strokeWidth={2.5} />Copied!</>
                                        : <><Copy size={13} strokeWidth={2} />Copy</>
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
                    <h1 className="text-xl font-semibold text-slate-900">API Key Management</h1>
                    <p className="mt-0.5 text-sm text-slate-500">Generate and manage merchant gateway API keys</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    Generate Key
                </button>
            </div>

            {/* Summary chips */}
            <div className="mb-6 flex flex-wrap gap-3">
                {[
                    { label: 'Total keys', value: totalKeys, valueClass: 'text-slate-900' },
                    { label: 'Active keys', value: activeKeys, valueClass: 'text-green-700' },
                    { label: 'Test keys', value: testKeys, valueClass: 'text-slate-600' },
                    { label: 'Live keys', value: liveKeys, valueClass: 'text-violet-700' },
                ].map(({ label, value, valueClass }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <span className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</span>
                        <span className="text-sm text-slate-500">{label}</span>
                    </div>
                ))}
            </div>

            {/* Keys table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">Merchant Gateway Keys</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Key</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Merchant</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Scopes</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Rotated</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {apiKeys.data.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-14 text-center">
                                        <div className="text-slate-400 text-sm">No API keys yet. Generate your first key to get started.</div>
                                    </td>
                                </tr>
                            ) : apiKeys.data.map((apiKey) => (
                                <tr key={apiKey.id} className="align-top hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-4">
                                        <span className="block font-medium text-slate-900">{apiKey.name || 'Gateway key'}</span>
                                        <code className="mt-0.5 block text-xs text-slate-500 font-mono">{apiKey.masked_key}</code>
                                        <div className="mt-1.5">
                                            <Badge value={apiKey.environment} size="sm" />
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="block font-medium text-slate-900">{apiKey.merchant?.name || 'Unknown'}</span>
                                        <span className="block text-xs text-slate-500">{apiKey.merchant?.email}</span>
                                    </td>
                                    <td className="px-5 py-4 max-w-xs">
                                        <ScopePills scopes={apiKey.scopes || []} />
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge value={apiKey.status} />
                                        {apiKey.revoked_at && (
                                            <span className="mt-1 block text-xs text-red-500">Revoked {apiKey.revoked_at}</span>
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
                                                Rotate
                                            </button>
                                            {apiKey.status === 'active' && (
                                                <button
                                                    onClick={() => revokeKey(apiKey.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                                                >
                                                    <XCircle size={12} strokeWidth={2} />
                                                    Revoke
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
            <Modal show={showModal} title="Generate API Key" onClose={() => setShowModal(false)}>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Merchant</label>
                        <select
                            className="w-full min-w-0 rounded-lg border border-slate-200 py-2 pl-3 pr-10 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={form.data.merchant_id}
                            onChange={(e) => form.setData('merchant_id', e.target.value)}
                            required
                        >
                            <option value="">Select a merchant...</option>
                            {merchants.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                            ))}
                        </select>
                        {form.errors.merchant_id && (
                            <p className="mt-1 text-xs text-red-600">{form.errors.merchant_id}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Key Name <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Production integration"
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Environment</label>
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
                                    {env}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Scopes</label>
                        <div className="grid grid-cols-2 gap-2">
                            {scopesMeta.map(({ id, label, desc }) => (
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
                                    <span className="ml-5 text-xs text-slate-500">{desc}</span>
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing || !form.data.merchant_id}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                        >
                            {form.processing ? 'Generating...' : 'Generate Key'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
