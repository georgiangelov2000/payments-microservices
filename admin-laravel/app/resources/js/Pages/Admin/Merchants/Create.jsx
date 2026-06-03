import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Circle, ChevronRight } from 'lucide-react';

// ─── Shared form primitives ───────────────────────────────────────────────────

function FormSection({ title, description, children }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            <div className="px-6 py-5 space-y-5">{children}</div>
        </div>
    );
}

function Field({ label, hint, error, required, children }) {
    return (
        <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
            {error && <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600"><AlertTriangle size={12} strokeWidth={2} /> {error}</p>}
        </div>
    );
}

function TextInput({ error, ...props }) {
    return (
        <input
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                error ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400' : 'border-slate-300 focus:border-indigo-500'
            }`}
            {...props}
        />
    );
}

// ─── Status picker ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    {
        value:       'pending',
        Icon:        Clock,
        iconColor:   'text-amber-500',
        label:       'Pending',
        description: 'Account created, awaiting setup and provider assignment.',
        ring:        'border-amber-400 bg-amber-50 ring-amber-300',
        idle:        'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40',
    },
    {
        value:       'active',
        Icon:        CheckCircle2,
        iconColor:   'text-green-500',
        label:       'Active',
        description: 'Account is live and ready to accept real payments.',
        ring:        'border-green-400 bg-green-50 ring-green-300',
        idle:        'border-slate-200 hover:border-green-300 hover:bg-green-50/40',
    },
    {
        value:       'inactive',
        Icon:        Circle,
        iconColor:   'text-slate-400',
        label:       'Inactive',
        description: 'Account exists but cannot process any payments.',
        ring:        'border-slate-400 bg-slate-100 ring-slate-300',
        idle:        'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    },
    {
        value:       'suspended',
        Icon:        XCircle,
        iconColor:   'text-red-500',
        label:       'Suspended',
        description: 'Account is suspended due to policy or compliance issues.',
        ring:        'border-red-400 bg-red-50 ring-red-300',
        idle:        'border-slate-200 hover:border-red-300 hover:bg-red-50/40',
    },
];

function StatusPicker({ value, onChange }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS_OPTIONS.map((opt) => {
                const selected = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`rounded-xl border p-4 text-left transition-all ${
                            selected ? `${opt.ring} ring-2` : opt.idle
                        }`}
                    >
                        <opt.Icon size={20} strokeWidth={2} className={`mb-1.5 ${opt.iconColor}`} />
                        <span className="block text-sm font-semibold text-slate-900">{opt.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 leading-snug">{opt.description}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MerchantsCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name:   '',
        email:  '',
        status: 'pending',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.merchants.store'));
    };

    return (
        <AdminLayout title="Add Merchant">
            <Head title="Add Merchant" />

            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                <Link href={route('admin.merchants.index')} className="hover:text-slate-700 transition-colors">Merchants</Link>
                <ChevronRight size={14} strokeWidth={2} className="text-slate-300" />
                <span className="font-medium text-slate-900">New Merchant</span>
            </nav>

            <form onSubmit={submit}>
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                    {/* ── Left: form sections ── */}
                    <div className="space-y-6">

                        {/* Account details */}
                        <FormSection
                            title="Account Details"
                            description="Basic information for the merchant account. A secure password will be auto-generated and can be reset by the merchant."
                        >
                            <Field
                                label="Full Name"
                                hint="The merchant's business or contact name."
                                error={errors.name}
                                required
                            >
                                <TextInput
                                    type="text"
                                    placeholder="e.g. Acme Corp"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoFocus
                                    error={errors.name}
                                />
                            </Field>

                            <Field
                                label="Email Address"
                                hint="Used for login and all platform notifications."
                                error={errors.email}
                                required
                            >
                                <TextInput
                                    type="email"
                                    placeholder="merchant@example.com"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={errors.email}
                                />
                            </Field>
                        </FormSection>

                        {/* Account status */}
                        <FormSection
                            title="Account Status"
                            description="Choose the initial status for this merchant. You can change it at any time from the merchant's profile."
                        >
                            <Field label="Initial Status" error={errors.status}>
                                <StatusPicker value={data.status} onChange={(v) => setData('status', v)} />
                            </Field>
                        </FormSection>

                    </div>

                    {/* ── Right: sidebar ── */}
                    <div className="space-y-4">

                        {/* Action card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4">Create merchant</h3>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                            >
                                {processing && (
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3-3-3h4z"/>
                                    </svg>
                                )}
                                {processing ? 'Creating…' : 'Create Merchant'}
                            </button>
                            <Link
                                href={route('admin.merchants.index')}
                                className="mt-3 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </Link>
                        </div>

                        {/* What happens next */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                            <h4 className="text-sm font-semibold text-blue-900 mb-3">What happens next?</h4>
                            <ol className="space-y-2.5">
                                {[
                                    'Merchant account is created with a secure auto-generated password.',
                                    'You\'ll be taken to the merchant\'s profile to assign payment providers.',
                                    'Once providers are assigned, the merchant can start routing payments.',
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800">{i + 1}</span>
                                        <span className="text-xs text-blue-800 leading-snug">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Status guide */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">Status guide</h4>
                            <div className="space-y-2">
                                {STATUS_OPTIONS.map((opt) => (
                                    <div key={opt.value} className="flex items-start gap-2">
                                        <span className="text-sm w-5 shrink-0">{opt.icon}</span>
                                        <div>
                                            <span className="text-xs font-semibold text-slate-700">{opt.label} — </span>
                                            <span className="text-xs text-slate-500">{opt.description}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </form>
        </AdminLayout>
    );
}
