import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import ProviderBrand from '@/Components/ProviderBrand';
import AdminLayout from '@/Layouts/AdminLayout';
import FormSection from '@/Components/FormSection';
import Field from '@/Components/Field';
import { fmtDate } from '@/utils';
import i18n from '@/i18n';
import {
    CheckCircle2, XCircle, Clock, Circle, Plus,
    Copy, ChevronDown, ChevronRight, CreditCard, Key, GitBranch,
    Store, FileDown,
} from 'lucide-react';

function TextInput({ error, className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400' : 'border-slate-300 focus:border-indigo-500'
            } ${className}`}
            {...props}
        />
    );
}

function SaveButton({ processing, label = 'Save Changes' }) {
    return (
        <button
            type="submit"
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
            {processing && (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z"/>
                </svg>
            )}
            {processing ? i18n.t('generated.common.saving') : label}
        </button>
    );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ value, label = 'Copy', size = 'md' }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const sz = size === 'sm'
        ? 'gap-1 px-2 py-1 text-xs'
        : 'gap-1.5 px-2.5 py-1.5 text-sm';

    return (
        <button
            type="button"
            onClick={copy}
            className={`inline-flex items-center rounded-lg border font-medium transition-colors ${sz} ${
                copied
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            {copied ? (
                <>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>{i18n.t('common.actions.copied')}</>
            ) : (
                <>
                    <Copy size={13} strokeWidth={2} />
                    {label}
                </>
            )}
        </button>
    );
}

// ─── Status picker (merchant account) ────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'pending',   Icon: Clock,         iconColor: 'text-amber-500', label: i18n.t('generated.common.pending'),   desc: i18n.t('generated.merchants_Edit.awaitingSetup'),     ring: 'border-amber-400 bg-amber-50 ring-amber-300',  idle: 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40' },
    { value: 'active',    Icon: CheckCircle2,  iconColor: 'text-green-500', label: i18n.t('generated.common.active'),    desc: i18n.t('generated.merchants_Edit.acceptingPayments'), ring: 'border-green-400 bg-green-50 ring-green-300',  idle: 'border-slate-200 hover:border-green-300 hover:bg-green-50/40' },
    { value: 'inactive',  Icon: Circle,        iconColor: 'text-slate-400', label: i18n.t('generated.common.inactive'),  desc: i18n.t('generated.merchants_Edit.accountDisabled'),   ring: 'border-slate-400 bg-slate-100 ring-slate-300', idle: 'border-slate-200 hover:border-slate-300 hover:bg-slate-50' },
    { value: 'suspended', Icon: XCircle,       iconColor: 'text-red-500',   label: i18n.t('generated.common.suspended'), desc: i18n.t('generated.merchants_Edit.suspendedByAdmin'), ring: 'border-red-400 bg-red-50 ring-red-300',        idle: 'border-slate-200 hover:border-red-300 hover:bg-red-50/40' },
];

function StatusPicker({ value, onChange }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_OPTIONS.map((opt) => {
                const selected = value === opt.value;
                return (
                    <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
                        className={`rounded-xl border p-3.5 text-left transition-all ${selected ? `${opt.ring} ring-2` : opt.idle}`}>
                        <opt.Icon size={18} strokeWidth={2} className={`mb-1 ${opt.iconColor}`} />
                        <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Provider status definitions ──────────────────────────────────────────────

const PROVIDER_STATUS_META = {
    pending: {
        label: i18n.t('generated.common.pending'),
        Icon:  Clock,
        desc:  i18n.t('generated.merchants_Edit.credentialsSavedButNotYetTestedProviderWill'),
        cls:   'border-amber-200 bg-amber-50 text-amber-700',
        dot:   'bg-amber-400',
    },
    active: {
        label: i18n.t('generated.common.active'),
        Icon:  CheckCircle2,
        desc:  i18n.t('generated.merchants_Edit.manuallyActivatedThisProviderWillReceivePaymentsAccording'),
        cls:   'border-green-200 bg-green-50 text-green-700',
        dot:   'bg-green-500',
    },
    validated: {
        label: i18n.t('generated.common.validated'),
        Icon:  CheckCircle2,
        desc:  i18n.t('generated.merchants_Edit.credentialsVerifiedByTheSystemFullyTrustedFor'),
        cls:   'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot:   'bg-emerald-500',
    },
    disabled: {
        label: i18n.t('generated.common.disabled'),
        Icon:  Circle,
        desc:  i18n.t('generated.merchants_Edit.providerIsDisabledNoPaymentsWillBeRouted'),
        cls:   'border-slate-200 bg-slate-100 text-slate-600',
        dot:   'bg-slate-400',
    },
};

const PROVIDER_FIELD_HELP = {
    stripe: {
        publicLabel: i18n.t('generated.common.publishableKey'),
        publicPlaceholder: 'pk_test_...',
        publicHint: i18n.t('generated.common.safeBrowserKeyStripeTest'),
        secretLabel: i18n.t('generated.common.secretKey'),
        secretPlaceholder: 'sk_test_...',
        secretHint: i18n.t('generated.common.stripeSecretHint'),
    },
    paypal: {
        publicLabel: i18n.t('generated.common.clientId'),
        publicPlaceholder: i18n.t('generated.common.paypalSandboxClientId'),
        publicHint: i18n.t('generated.common.paypalClientIdHint'),
        secretLabel: i18n.t('generated.common.clientSecret'),
        secretPlaceholder: i18n.t('generated.common.paypalSandboxClientSecret'),
        secretHint: i18n.t('generated.common.paypalSecretHint'),
    },
    default: {
        publicLabel: i18n.t('generated.common.publicKey'),
        publicPlaceholder: i18n.t('generated.common.providerPublicKeyPlaceholder'),
        publicHint: i18n.t('generated.common.providerPublicKeyHint'),
        secretLabel: i18n.t('generated.common.secretKey'),
        secretPlaceholder: i18n.t('generated.common.providerSecretKey'),
        secretHint: i18n.t('generated.common.providerSecretHint'),
    },
};

function providerFieldHelp(provider) {
    return PROVIDER_FIELD_HELP[provider?.alias] ?? PROVIDER_FIELD_HELP.default;
}

// Custom provider status selector with descriptions
function ProviderStatusSelect({ value, onChange, disabled }) {
    const [open, setOpen] = useState(false);
    const current = PROVIDER_STATUS_META[value] ?? PROVIDER_STATUS_META.pending;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors w-full text-left ${current.cls} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}
            >
                <span className={`h-2 w-2 rounded-full shrink-0 ${current.dot}`} />
                <span className="flex-1">{current.label}</span>
                {!disabled && (
                    <ChevronDown size={15} strokeWidth={2} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                        {Object.entries(PROVIDER_STATUS_META).map(([status, meta]) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => { onChange(status); setOpen(false); }}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${value === status ? 'bg-indigo-50' : ''}`}
                            >
                                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                                <div>
                                    <p className={`text-sm font-semibold ${value === status ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {meta.label}
                                        {value === status && <span className="ml-1.5 text-xs font-normal text-indigo-500">{i18n.t('generated.merchants_Edit.current')}</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{meta.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value, color = 'text-slate-900' }) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className={`text-2xl font-bold tabular-nums ${color}`}>{value}</span>
            <span className="text-xs text-slate-500 mt-0.5">{label}</span>
        </div>
    );
}

// ─── Provider credential row ──────────────────────────────────────────────────

function ProviderRow({ credential }) {
    const [status, setStatus] = useState(credential.status);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const fieldHelp = providerFieldHelp({ alias: credential.provider_alias });

    const form = useForm({
        display_name: credential.display_name || '',
        public_key: '',
        secret_value: '',
        status: credential.status,
    });

    const handleChange = (newStatus) => {
        setStatus(newStatus);
        form.setData('status', newStatus);
        setSaving(true);
        router.put(
            route('admin.merchant-provider-credentials.update', credential.id),
            { status: newStatus },
            { preserveScroll: true, onFinish: () => setSaving(false) }
        );
    };

    const submit = (e) => {
        e.preventDefault();
        form.put(route('admin.merchant-provider-credentials.update', credential.id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('public_key', 'secret_value');
                setEditing(false);
            },
        });
    };

    const meta = PROVIDER_STATUS_META[status] ?? PROVIDER_STATUS_META.pending;

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Left: provider info */}
                <div className="flex items-start gap-3">
                    <ProviderBrand alias={credential.provider_alias} label={credential.provider_name} size="md" variant="icon" />
                    <div>
                        <ProviderBrand alias={credential.provider_alias} label={credential.provider_name} variant="compact" className="bg-white" />
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${credential.environment === 'live' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                                {credential.environment}
                            </span>
                            {credential.display_name && (
                                <span className="text-xs text-slate-500">{credential.display_name}</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: status selector */}
                <div className="flex flex-col items-end gap-1.5 min-w-[180px]">
                    <ProviderStatusSelect value={status} onChange={handleChange} disabled={saving} />
                    {credential.last_validated_at && (
                        <span className="text-xs text-slate-400">{i18n.t('generated.merchants_Edit.validated')}{' '}{credential.last_validated_at}</span>
                    )}
                    <button
                        type="button"
                        onClick={() => setEditing((value) => !value)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        {editing ? i18n.t('generated.common.closeEditor') : i18n.t('generated.common.editCredentials')}
                    </button>
                </div>
            </div>

            {/* Status description callout */}
            <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${meta.cls}`}>
                <span className="shrink-0 mt-0.5">{meta.icon}</span>
                <p className="leading-snug">{meta.desc}</p>
            </div>

            {/* Credential details */}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{fieldHelp.publicLabel}</p>
                    <code className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 block truncate">
                        {credential.public_key || '—'}
                    </code>
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">{fieldHelp.secretLabel}</p>
                    <code className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 block">
                        {credential.has_secret ? '••••••••••••' : i18n.t('generated.common.notStored')}
                    </code>
                </div>
            </div>

            {editing && (
                <form onSubmit={submit} className="mt-4 rounded-xl border border-indigo-100 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label={i18n.t('generated.merchants_Edit.displayName')} hint={i18n.t('generated.merchants_Edit.optionalLabelShownOnlyInPayflow')} error={form.errors.display_name}>
                            <TextInput
                                value={form.data.display_name}
                                onChange={(e) => form.setData('display_name', e.target.value)}
                                placeholder={`${credential.provider_name} sandbox`}
                                error={form.errors.display_name}
                            />
                        </Field>
                        <Field label={i18n.t('generated.merchants_Edit.status')} error={form.errors.status}>
                            <ProviderStatusSelect
                                value={form.data.status}
                                onChange={(value) => {
                                    form.setData('status', value);
                                    setStatus(value);
                                }}
                                disabled={form.processing}
                            />
                        </Field>
                        <Field label={fieldHelp.publicLabel} hint={`${fieldHelp.publicHint} Leave blank to keep the saved value.`} error={form.errors.public_key}>
                            <TextInput
                                value={form.data.public_key}
                                onChange={(e) => form.setData('public_key', e.target.value)}
                                placeholder={fieldHelp.publicPlaceholder}
                                error={form.errors.public_key}
                                className="font-mono"
                            />
                        </Field>
                        <Field label={fieldHelp.secretLabel} hint={`${fieldHelp.secretHint} Leave blank to keep the saved value.`} error={form.errors.secret_value}>
                            <TextInput
                                type="password"
                                value={form.data.secret_value}
                                onChange={(e) => form.setData('secret_value', e.target.value)}
                                placeholder={fieldHelp.secretPlaceholder}
                                error={form.errors.secret_value}
                                className="font-mono"
                            />
                        </Field>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >{i18n.t('common.actions.cancel')}</button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {form.processing ? i18n.t('generated.common.saving') : i18n.t('generated.common.saveCredentials')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Add provider sub-form ────────────────────────────────────────────────────

const PROVIDER_STATUSES = Object.keys(PROVIDER_STATUS_META);

function AddProviderForm({ merchantId, availableProviders, onSuccess }) {
    const form = useForm({
        provider_id:  availableProviders[0]?.id || '',
        environment:  'test',
        display_name: '',
        public_key:   '',
        secret_value: '',
        status:       'pending',
    });
    const selectedProvider = availableProviders.find((provider) => provider.id === form.data.provider_id) ?? availableProviders[0];
    const fieldHelp = providerFieldHelp(selectedProvider);

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.merchants.providers.store', merchantId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('display_name', 'public_key', 'secret_value');
                onSuccess?.();
            },
        });
    };

    return (
        <form onSubmit={submit} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm space-y-4">
            <div>
                <h4 className="text-sm font-semibold text-slate-900">{i18n.t('generated.merchants_Edit.addPaymentProviderCredentials')}</h4>
                <p className="mt-1 text-xs text-slate-500">{i18n.t('generated.merchants_Edit.connectThisMerchantToAProcessorAccountFor')}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label={i18n.t('generated.merchants_Edit.provider')} required error={form.errors.provider_id}>
                    {selectedProvider && (
                        <div className="mb-2">
                            <ProviderBrand alias={selectedProvider.alias} label={selectedProvider.name} />
                        </div>
                    )}
                    <select
                        className={`w-full min-w-0 rounded-xl border py-2.5 pl-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${form.errors.provider_id ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-white'}`}
                        value={form.data.provider_id}
                        onChange={(e) => form.setData('provider_id', e.target.value)}
                    >
                        {availableProviders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </Field>
                <Field label={i18n.t('generated.merchants_Edit.environment')} required>
                    <div className="flex gap-2">
                        {['test', 'live'].map((env) => (
                            <button key={env} type="button" onClick={() => form.setData('environment', env)}
                                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium capitalize transition-colors ${
                                    form.data.environment === env
                                        ? env === 'live' ? 'border-violet-500 bg-violet-600 text-white' : 'border-indigo-500 bg-indigo-600 text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}>
                                {env}
                            </button>
                        ))}
                    </div>
                </Field>
            </div>

            <Field label={i18n.t('generated.merchants_Edit.displayName')} hint={i18n.t('generated.merchants_Edit.optionalLabelForAdminsSuchAsStripeSandbox')} error={form.errors.display_name}>
                <TextInput placeholder={i18n.t('generated.common.providerSandbox', { provider: selectedProvider?.name ?? i18n.t('generated.common.provider') })} value={form.data.display_name}
                    onChange={(e) => form.setData('display_name', e.target.value)} error={form.errors.display_name} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
                <Field label={fieldHelp.publicLabel} hint={fieldHelp.publicHint} error={form.errors.public_key}>
                    <TextInput placeholder={fieldHelp.publicPlaceholder} value={form.data.public_key}
                        onChange={(e) => form.setData('public_key', e.target.value)}
                        error={form.errors.public_key} className="font-mono" />
                </Field>
                <Field label={fieldHelp.secretLabel} hint={`${fieldHelp.secretHint} Stored securely and never displayed again.`} error={form.errors.secret_value}>
                    <TextInput type="password" placeholder={fieldHelp.secretPlaceholder} value={form.data.secret_value}
                        onChange={(e) => form.setData('secret_value', e.target.value)}
                        error={form.errors.secret_value} className="font-mono" />
                </Field>
            </div>

            {/* Status picker with descriptions */}
            <Field label={i18n.t('generated.merchants_Edit.initialStatus')}>
                <div className="space-y-2">
                    {PROVIDER_STATUSES.map((s) => {
                        const meta = PROVIDER_STATUS_META[s];
                        return (
                            <button key={s} type="button" onClick={() => form.setData('status', s)}
                                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                                    form.data.status === s
                                        ? `ring-2 ${meta.cls}`
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}>
                                <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{meta.desc}</p>
                                </div>
                                {form.data.status === s && (
                                    <svg className="ml-auto h-4 w-4 shrink-0 text-indigo-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Field>

            <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={onSuccess}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{i18n.t('common.actions.cancel')}</button>
                <button type="submit" disabled={form.processing}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                    {form.processing ? i18n.t('generated.common.assigning') : i18n.t('generated.common.assignProvider')}
                </button>
            </div>
        </form>
    );
}

// ─── API keys section ─────────────────────────────────────────────────────────

const KEY_ENV_COLORS = {
    test: 'border-slate-200 bg-slate-50 text-slate-600',
    live: 'border-violet-200 bg-violet-50 text-violet-700',
};

function ApiKeysSection({ merchant, generatedKey }) {
    const [showNewKeyForm, setShowNewKeyForm] = useState(false);
    const [generatedKeyDismissed, setGeneratedKeyDismissed] = useState(false);
    const [rotatingId, setRotatingId] = useState(null);
    const [revokingId, setRevokingId]  = useState(null);

    const apiKeys = merchant.api_keys ?? [];

    const form = useForm({
        merchant_id: merchant.id,
        name: '',
        environment: 'test',
        scopes: ['payments:create', 'payments:read'],
    });

    const submit = (e) => {
        e.preventDefault();
        form.post(route('admin.api-keys.store'), {
            preserveScroll: true,
            onSuccess: () => { form.reset('name'); setShowNewKeyForm(false); },
        });
    };

    const rotate = (id) => {
        setRotatingId(id);
        router.post(route('admin.api-keys.rotate', id), {}, {
            preserveScroll: true,
            onFinish: () => setRotatingId(null),
        });
    };

    const revoke = (id) => {
        if (!window.confirm(i18n.t('generated.merchants_Edit.revokeThisApiKeyThisCannotBeUndone'))) return;
        setRevokingId(id);
        router.post(route('admin.api-keys.revoke', id), {}, {
            preserveScroll: true,
            onFinish: () => setRevokingId(null),
        });
    };

    const showBanner = generatedKey && !generatedKeyDismissed;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{i18n.t('common.nav.apiKeys')}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        {apiKeys.length === 0 ? i18n.t('generated.common.noApiKeysYet') : i18n.t('generated.common.apiKeySummary', { count: apiKeys.length })}
                    </p>
                </div>
                {!showNewKeyForm && (
                    <button onClick={() => setShowNewKeyForm(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>{i18n.t('generated.merchants_Edit.generateKey')}</button>
                )}
            </div>

            <div className="px-6 py-5 space-y-4">
                {/* Generated key banner — shown once after creation/rotation */}
                {showBanner && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                                    <CheckCircle2 size={14} strokeWidth={2} />{i18n.t('generated.merchants_Edit.apiKeyGeneratedCopyItNow')}</p>
                                <p className="mt-0.5 text-xs text-emerald-600">{i18n.t('generated.merchants_Edit.thisKeyWillNotBeShownAgainAfter')}</p>
                            </div>
                            <button onClick={() => setGeneratedKeyDismissed(true)}
                                className="text-emerald-400 hover:text-emerald-600 text-lg leading-none">×</button>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-mono text-slate-800 break-all">
                                {generatedKey}
                            </code>
                            <CopyButton value={generatedKey} label={i18n.t('generated.merchants_Edit.copyKey')} />
                        </div>
                    </div>
                )}

                {/* New key form */}
                {showNewKeyForm && (
                    <form onSubmit={submit} className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-slate-800">{i18n.t('generated.merchants_Edit.generateANewApiKey')}</h4>
                        <Field label={i18n.t('generated.merchants_Edit.keyName')}>
                            <TextInput placeholder={i18n.t('generated.merchants_Edit.eGProductionGatewayKey')}
                                value={form.data.name} onChange={e => form.setData('name', e.target.value)} />
                        </Field>
                        <Field label={i18n.t('generated.merchants_Edit.environment')}>
                            <div className="flex gap-2">
                                {['test', 'live'].map(env => (
                                    <button key={env} type="button" onClick={() => form.setData('environment', env)}
                                        className={`flex-1 rounded-xl border py-2 text-sm font-medium capitalize transition-colors ${
                                            form.data.environment === env
                                                ? env === 'live' ? 'border-violet-500 bg-violet-600 text-white' : 'border-indigo-500 bg-indigo-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}>
                                        {env}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowNewKeyForm(false)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">{i18n.t('common.actions.cancel')}</button>
                            <button type="submit" disabled={form.processing}
                                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                                {form.processing ? i18n.t('generated.common.generating') : i18n.t('generated.common.generate')}
                            </button>
                        </div>
                    </form>
                )}

                {/* Existing keys */}
                {apiKeys.length === 0 && !showNewKeyForm ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Key size={22} strokeWidth={1.75} /></div>
                        <p className="text-sm font-medium text-slate-700">{i18n.t('generated.merchants_Edit.noApiKeysYet')}</p>
                        <p className="mt-1 text-xs text-slate-400">{i18n.t('generated.merchants_Edit.generateAKeySoThisMerchantCanAuthenticate')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {apiKeys.map(key => (
                            <div key={key.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    {/* Key info */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{key.name || 'Unnamed key'}</p>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${KEY_ENV_COLORS[key.environment] ?? KEY_ENV_COLORS.test}`}>
                                                {key.environment}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                                                key.revoked_at ? 'border-red-200 bg-red-50 text-red-700' :
                                                key.status === 'active' ? 'border-green-200 bg-green-50 text-green-700' :
                                                'border-slate-200 bg-slate-100 text-slate-600'
                                            }`}>
                                                {key.revoked_at ? i18n.t('generated.common.revoked') : key.status}
                                            </span>
                                        </div>
                                        {key.last_rotated_at && (
                                            <p className="mt-1 text-xs text-slate-400">{i18n.t('generated.merchants_Edit.lastRotated')}{' '}{fmtDate(key.last_rotated_at)}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {!key.revoked_at && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button onClick={() => rotate(key.id)} disabled={rotatingId === key.id}
                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                                                {rotatingId === key.id ? i18n.t('generated.common.rotating') : i18n.t('generated.common.rotate')}
                                            </button>
                                            <button onClick={() => revoke(key.id)} disabled={revokingId === key.id}
                                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors">
                                                {revokingId === key.id ? i18n.t('generated.common.revoking') : i18n.t('generated.common.revoke')}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Key prefix + copy */}
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-slate-500 mb-1">{i18n.t('generated.merchants_Edit.keyPrefixFirst14Characters')}</p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-mono text-slate-700">
                                                {key.key_prefix}••••••••••••••••••••
                                            </code>
                                            <CopyButton value={key.key_prefix} label={i18n.t('generated.merchants_Edit.copyPrefix')} size="sm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Scopes */}
                                {key.scopes?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {key.scopes.map(s => (
                                            <span key={s} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono text-slate-500">{s}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MerchantsEdit({ merchant, availableProviders, generatedKey }) {
    const { props } = usePage();
    const flash      = props.flash ?? {};

    const [showAddProvider, setShowAddProvider] = useState(false);

    const infoForm = useForm({
        _method: 'put',
        name: merchant.name ?? '',
        email: merchant.email ?? '',
        company_name: merchant.company_name ?? '',
        legal_name: merchant.legal_name ?? '',
        logo: null,
        remove_logo: false,
        website: merchant.website ?? '',
        phone: merchant.phone ?? '',
        tax_id: merchant.tax_id ?? '',
        country: merchant.country ?? '',
        city: merchant.city ?? '',
        postal_code: merchant.postal_code ?? '',
        address_line1: merchant.address_line1 ?? '',
        address_line2: merchant.address_line2 ?? '',
    });
    const statusForm = useForm({ status: merchant.status });

    const saveInfo = (e) => {
        e.preventDefault();
        infoForm.post(route('admin.merchants.update', merchant.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => infoForm.setData('logo', null),
        });
    };
    const saveStatus = (e) => { e.preventDefault(); statusForm.put(route('admin.merchants.update', merchant.id), { preserveScroll: true }); };

    const currentStatus = STATUS_OPTIONS.find((o) => o.value === merchant.status);

    return (
        <AdminLayout title={merchant.name}>
            <Head title={`Edit — ${merchant.name}`} />

            <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                <Link href={route('admin.merchants.index')} className="hover:text-slate-700 transition-colors">{i18n.t('common.nav.merchants')}</Link>
                <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6"/></svg>
                <span className="font-medium text-slate-900 truncate">{merchant.name}</span>
            </nav>

            {flash.success && (
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5">
                    <CheckCircle2 size={16} strokeWidth={2} className="shrink-0 text-green-500" />
                    <p className="text-sm font-medium text-green-800">{flash.success}</p>
                </div>
            )}

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                        {merchant.logo_url
                            ? <img src={merchant.logo_url} alt={`${merchant.company_name || merchant.name} logo`} className="h-full w-full object-contain" />
                            : <Store size={26} strokeWidth={1.8} />}
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">{merchant.company_name || merchant.name}</h1>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                            {merchant.company_name && <span className="text-sm text-slate-500">{merchant.name}</span>}
                            <span className="text-sm text-slate-500">{merchant.email}</span>
                            {currentStatus && (
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                    merchant.status === 'active'    ? 'border-green-200 bg-green-100 text-green-700' :
                                    merchant.status === 'suspended' ? 'border-red-200 bg-red-100 text-red-700' :
                                    merchant.status === 'pending'   ? 'border-amber-200 bg-amber-100 text-amber-700' :
                                    'border-slate-200 bg-slate-100 text-slate-600'
                                }`}>
                                    {currentStatus.icon} {currentStatus.label}
                                </span>
                            )}
                            <span className="text-xs text-slate-400">{i18n.t('generated.merchants_Edit.memberSince')}{' '}{fmtDate(merchant.created_at)}</span>
                        </div>
                    </div>
                </div>
                <a
                    href={route('admin.merchants.onboarding-guide.download', merchant.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
                >
                    <FileDown size={16} strokeWidth={2} />
                    {i18n.t('merchants.onboarding.download')}
                </a>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3 sm:w-fit">
                <StatChip label={i18n.t('common.nav.payments')}      value={merchant.payments_count}      color="text-indigo-700" />
                <StatChip label={i18n.t('common.nav.apiKeys')}      value={merchant.api_keys_count}      color="text-slate-900" />
                <StatChip label={i18n.t('common.nav.subscriptions')} value={merchant.subscriptions_count} color="text-slate-900" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                <div className="space-y-6">

                    {/* Account information */}
                    <form onSubmit={saveInfo}>
                        <FormSection title={i18n.t('generated.merchants_Edit.accountCompanyInformation')} description={i18n.t('generated.merchants_Edit.updateTheMerchantContactBrandLegalDetailsAnd')}
                            actions={<SaveButton processing={infoForm.processing} />}>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={i18n.t('generated.merchants_Edit.contactName')} error={infoForm.errors.name} required>
                                    <TextInput type="text" value={infoForm.data.name}
                                        onChange={(e) => infoForm.setData('name', e.target.value)} error={infoForm.errors.name} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.emailAddress')} hint={i18n.t('generated.merchants_Edit.alsoUpdatesTheMerchantsLogin')} error={infoForm.errors.email} required>
                                    <TextInput type="email" value={infoForm.data.email}
                                        onChange={(e) => infoForm.setData('email', e.target.value)} error={infoForm.errors.email} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.tradingName')} error={infoForm.errors.company_name}>
                                    <TextInput type="text" value={infoForm.data.company_name}
                                        onChange={(e) => infoForm.setData('company_name', e.target.value)} error={infoForm.errors.company_name} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.legalCompanyName')} error={infoForm.errors.legal_name}>
                                    <TextInput type="text" value={infoForm.data.legal_name}
                                        onChange={(e) => infoForm.setData('legal_name', e.target.value)} error={infoForm.errors.legal_name} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.website')} error={infoForm.errors.website}>
                                    <TextInput type="url" placeholder="https://example.com" value={infoForm.data.website}
                                        onChange={(e) => infoForm.setData('website', e.target.value)} error={infoForm.errors.website} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.phone')} error={infoForm.errors.phone}>
                                    <TextInput type="tel" value={infoForm.data.phone}
                                        onChange={(e) => infoForm.setData('phone', e.target.value)} error={infoForm.errors.phone} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.taxVatId')} error={infoForm.errors.tax_id}>
                                    <TextInput type="text" value={infoForm.data.tax_id}
                                        onChange={(e) => infoForm.setData('tax_id', e.target.value)} error={infoForm.errors.tax_id} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.countryCode')} hint={i18n.t('generated.merchants_Edit.twoLetterIsoCode')} error={infoForm.errors.country}>
                                    <TextInput type="text" maxLength={2} value={infoForm.data.country}
                                        onChange={(e) => infoForm.setData('country', e.target.value.toUpperCase())} error={infoForm.errors.country} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.addressLine1')} error={infoForm.errors.address_line1}>
                                    <TextInput type="text" value={infoForm.data.address_line1}
                                        onChange={(e) => infoForm.setData('address_line1', e.target.value)} error={infoForm.errors.address_line1} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.addressLine2')} error={infoForm.errors.address_line2}>
                                    <TextInput type="text" value={infoForm.data.address_line2}
                                        onChange={(e) => infoForm.setData('address_line2', e.target.value)} error={infoForm.errors.address_line2} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.city')} error={infoForm.errors.city}>
                                    <TextInput type="text" value={infoForm.data.city}
                                        onChange={(e) => infoForm.setData('city', e.target.value)} error={infoForm.errors.city} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Edit.postalCode')} error={infoForm.errors.postal_code}>
                                    <TextInput type="text" value={infoForm.data.postal_code}
                                        onChange={(e) => infoForm.setData('postal_code', e.target.value)} error={infoForm.errors.postal_code} />
                                </Field>
                            </div>
                            <Field label={i18n.t('generated.merchants_Edit.companyLogo')} hint={i18n.t('generated.merchants_Edit.jpgPngOrWebpUpTo2Mb')} error={infoForm.errors.logo}>
                                <div className="flex flex-wrap items-center gap-3">
                                    <input type="file" accept="image/jpeg,image/png,image/webp"
                                        onChange={(e) => {
                                            infoForm.setData('logo', e.target.files?.[0] ?? null);
                                            infoForm.setData('remove_logo', false);
                                        }}
                                        className="block flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-medium file:text-indigo-700" />
                                    {merchant.logo_url && (
                                        <button type="button" onClick={() => {
                                            infoForm.setData('logo', null);
                                            infoForm.setData('remove_logo', true);
                                        }} className="text-sm font-medium text-red-600 hover:text-red-700">{i18n.t('generated.merchants_Edit.removeLogo')}</button>
                                    )}
                                </div>
                            </Field>
                        </FormSection>
                    </form>

                    {/* Account status */}
                    <form onSubmit={saveStatus}>
                        <FormSection title={i18n.t('generated.merchants_Edit.accountStatus')} description={i18n.t('generated.merchants_Edit.controlWhetherThisMerchantCanAcceptPayments')}
                            actions={<SaveButton processing={statusForm.processing} label={i18n.t('generated.merchants_Edit.updateStatus')} />}>
                            <StatusPicker value={statusForm.data.status} onChange={(v) => statusForm.setData('status', v)} />
                            {statusForm.data.status === 'suspended' && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 shrink-0" />{i18n.t('generated.merchants_Edit.suspendingThisMerchantWillImmediatelyPreventAllPayment')}</div>
                            )}
                        </FormSection>
                    </form>

                    {/* Payment providers */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">{i18n.t('generated.merchants_Edit.paymentProviders')}</h2>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    {merchant.provider_credentials.length === 0
                                        ? i18n.t('generated.common.noProvidersAssigned')
                                        : i18n.t('generated.common.providersConfigured', { count: merchant.provider_credentials.length })}
                                </p>
                            </div>
                            {!showAddProvider && (
                                <button type="button" onClick={() => setShowAddProvider(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>{i18n.t('generated.merchants_Edit.addProvider')}</button>
                            )}
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            {merchant.provider_credentials.length > 0
                                ? merchant.provider_credentials.map((cred) => <ProviderRow key={cred.id} credential={cred} />)
                                : !showAddProvider && (
                                    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CreditCard size={22} strokeWidth={1.75} /></div>
                                        <p className="text-sm font-medium text-slate-700">{i18n.t('generated.merchants_Edit.noPaymentProvidersYet')}</p>
                                        <p className="mt-1 text-xs text-slate-400">{i18n.t('generated.merchants_Edit.assignAProviderToAllowThisMerchantTo')}</p>
                                        <button type="button" onClick={() => setShowAddProvider(true)}
                                            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                                            <Plus size={14} strokeWidth={2.5} />{i18n.t('generated.merchants_Edit.assignFirstProvider')}</button>
                                    </div>
                                )}
                            {showAddProvider && (
                                <AddProviderForm merchantId={merchant.id} availableProviders={availableProviders}
                                    onSuccess={() => setShowAddProvider(false)} />
                            )}
                        </div>
                    </div>

                    {/* API Keys */}
                    <ApiKeysSection merchant={merchant} generatedKey={generatedKey} />

                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{i18n.t('generated.merchants_Edit.quickLinks')}</h3>
                        {[
                            { label: i18n.t('merchants.onboarding.download'), href: route('admin.merchants.onboarding-guide.download', merchant.id), Icon: FileDown, external: true },
                            { label: i18n.t('generated.merchants_Edit.viewPayments'),   href: route('admin.payments.index'), Icon: CreditCard },
                            { label: i18n.t('generated.merchants_Edit.manageApiKeys'), href: route('admin.api-keys.index'), Icon: Key },
                            { label: i18n.t('generated.merchants_Edit.paymentRouting'), href: route('admin.routing.index'),  Icon: GitBranch },
                        ].map(({ label, href, Icon, external }) => external ? (
                            <a key={href} href={href}
                                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                                <Icon size={15} strokeWidth={1.75} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{label}</span>
                                <ChevronRight size={13} strokeWidth={2} className="text-slate-300" />
                            </a>
                        ) : (
                            <Link key={href} href={href}
                                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-200 transition-colors">
                                <Icon size={15} strokeWidth={1.75} className="shrink-0 text-slate-400" />
                                <span className="flex-1">{label}</span>
                                <ChevronRight size={13} strokeWidth={2} className="text-slate-300" />
                            </Link>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{i18n.t('generated.merchants_Edit.accountDetails')}</h3>
                        <dl className="space-y-3">
                            <div>
                                <dt className="text-xs font-medium text-slate-500">{i18n.t('generated.merchants_Edit.merchantId')}</dt>
                                <div className="mt-1 flex items-center gap-2">
                                    <dd className="flex-1 font-mono text-xs text-slate-600 break-all">{merchant.id}</dd>
                                    <CopyButton value={merchant.id} size="sm" label={i18n.t('common.actions.copy')} />
                                </div>
                            </div>
                            <div>
                                <dt className="text-xs font-medium text-slate-500">Created</dt>
                                <dd className="mt-0.5 text-sm text-slate-900">{fmtDate(merchant.created_at)}</dd>
                            </div>
                        </dl>
                    </div>

                    <Link href={route('admin.merchants.index')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6"/></svg>{i18n.t('generated.merchants_Edit.backToMerchants')}</Link>
                </div>
            </div>
        </AdminLayout>
    );
}
