import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import FormSection from '@/Components/FormSection';
import Field from '@/Components/Field';
import { CheckCircle2, XCircle, Clock, Circle, ChevronRight } from 'lucide-react';

import i18n from '@/i18n';
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
        label:       i18n.t('generated.common.pending'),
        description: i18n.t('generated.merchants_Create.accountCreatedAwaitingSetupAndProviderAssignment'),
        ring:        'border-amber-400 bg-amber-50 ring-amber-300',
        idle:        'border-slate-200 hover:border-amber-300 hover:bg-amber-50/40',
    },
    {
        value:       'active',
        Icon:        CheckCircle2,
        iconColor:   'text-green-500',
        label:       i18n.t('generated.common.active'),
        description: i18n.t('generated.merchants_Create.accountIsLiveAndReadyToAcceptReal'),
        ring:        'border-green-400 bg-green-50 ring-green-300',
        idle:        'border-slate-200 hover:border-green-300 hover:bg-green-50/40',
    },
    {
        value:       'inactive',
        Icon:        Circle,
        iconColor:   'text-slate-400',
        label:       i18n.t('generated.common.inactive'),
        description: i18n.t('generated.merchants_Create.accountExistsButCannotProcessAnyPayments'),
        ring:        'border-slate-400 bg-slate-100 ring-slate-300',
        idle:        'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
    },
    {
        value:       'suspended',
        Icon:        XCircle,
        iconColor:   'text-red-500',
        label:       i18n.t('generated.common.suspended'),
        description: i18n.t('generated.merchants_Create.accountIsSuspendedDueToPolicyOrCompliance'),
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
        name: '',
        email: '',
        company_name: '',
        legal_name: '',
        logo: null,
        website: '',
        phone: '',
        tax_id: '',
        country: '',
        city: '',
        postal_code: '',
        address_line1: '',
        address_line2: '',
        status: 'pending',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.merchants.store'), { forceFormData: true });
    };

    return (
        <AdminLayout title={i18n.t('generated.merchants_Create.addMerchant')}>
            <Head title={i18n.t('generated.merchants_Create.addMerchant')} />

            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
                <Link href={route('admin.merchants.index')} className="hover:text-slate-700 transition-colors">{i18n.t('common.nav.merchants')}</Link>
                <ChevronRight size={14} strokeWidth={2} className="text-slate-300" />
                <span className="font-medium text-slate-900">{i18n.t('generated.merchants_Create.newMerchant')}</span>
            </nav>

            <form onSubmit={submit}>
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

                    {/* ── Left: form sections ── */}
                    <div className="space-y-6">

                        {/* Account details */}
                        <FormSection
                            title={i18n.t('generated.merchants_Create.accountDetails')}
                            description={i18n.t('generated.merchants_Create.basicInformationForTheMerchantAccountASecure')}
                        >
                            <Field
                                label={i18n.t('generated.merchants_Create.fullName')}
                                hint={i18n.t('generated.merchants_Create.theMerchantsBusinessOrContactName')}
                                error={errors.name}
                                required
                            >
                                <TextInput
                                    type="text"
                                    placeholder={i18n.t('generated.merchants_Create.eGAcmeCorp')}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    autoFocus
                                    error={errors.name}
                                />
                            </Field>

                            <Field
                                label={i18n.t('generated.merchants_Create.emailAddress')}
                                hint={i18n.t('generated.merchants_Create.usedForLoginAndAllPlatformNotifications')}
                                error={errors.email}
                                required
                            >
                                <TextInput
                                    type="email"
                                    placeholder={i18n.t('generated.merchants_Create.merchantExampleCom')}
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    error={errors.email}
                                />
                            </Field>
                        </FormSection>

                        <FormSection
                            title={i18n.t('generated.merchants_Create.companyProfile')}
                            description={i18n.t('generated.merchants_Create.brandLegalAndContactDetailsForThisMerchant')}
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={i18n.t('generated.merchants_Create.tradingName')} error={errors.company_name}>
                                    <TextInput type="text" placeholder={i18n.t('generated.merchants_Create.acmePayments')} value={data.company_name}
                                        onChange={(e) => setData('company_name', e.target.value)} error={errors.company_name} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.legalCompanyName')} error={errors.legal_name}>
                                    <TextInput type="text" placeholder={i18n.t('generated.merchants_Create.acmePaymentsLtd')} value={data.legal_name}
                                        onChange={(e) => setData('legal_name', e.target.value)} error={errors.legal_name} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.website')} error={errors.website}>
                                    <TextInput type="url" placeholder="https://example.com" value={data.website}
                                        onChange={(e) => setData('website', e.target.value)} error={errors.website} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.phone')} error={errors.phone}>
                                    <TextInput type="tel" placeholder="+359 2 123 4567" value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)} error={errors.phone} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.taxVatId')} error={errors.tax_id}>
                                    <TextInput type="text" value={data.tax_id}
                                        onChange={(e) => setData('tax_id', e.target.value)} error={errors.tax_id} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.countryCode')} hint={i18n.t('generated.merchants_Create.twoLetterIsoCodeForExampleBgOr')} error={errors.country}>
                                    <TextInput type="text" maxLength={2} placeholder="BG" value={data.country}
                                        onChange={(e) => setData('country', e.target.value.toUpperCase())} error={errors.country} />
                                </Field>
                            </div>
                            <Field label={i18n.t('generated.merchants_Create.companyLogo')} hint={i18n.t('generated.merchants_Create.jpgPngOrWebpUpTo2Mb')} error={errors.logo}>
                                <input type="file" accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => setData('logo', e.target.files?.[0] ?? null)}
                                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:font-medium file:text-indigo-700" />
                            </Field>
                        </FormSection>

                        <FormSection
                            title={i18n.t('generated.merchants_Create.businessAddress')}
                            description={i18n.t('generated.merchants_Create.optionalRegisteredOrOperatingAddress')}
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label={i18n.t('generated.merchants_Create.addressLine1')} error={errors.address_line1}>
                                    <TextInput type="text" value={data.address_line1}
                                        onChange={(e) => setData('address_line1', e.target.value)} error={errors.address_line1} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.addressLine2')} error={errors.address_line2}>
                                    <TextInput type="text" value={data.address_line2}
                                        onChange={(e) => setData('address_line2', e.target.value)} error={errors.address_line2} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.city')} error={errors.city}>
                                    <TextInput type="text" value={data.city}
                                        onChange={(e) => setData('city', e.target.value)} error={errors.city} />
                                </Field>
                                <Field label={i18n.t('generated.merchants_Create.postalCode')} error={errors.postal_code}>
                                    <TextInput type="text" value={data.postal_code}
                                        onChange={(e) => setData('postal_code', e.target.value)} error={errors.postal_code} />
                                </Field>
                            </div>
                        </FormSection>

                        {/* Account status */}
                        <FormSection
                            title={i18n.t('generated.merchants_Create.accountStatus')}
                            description={i18n.t('generated.merchants_Create.chooseTheInitialStatusForThisMerchantYou')}
                        >
                            <Field label={i18n.t('generated.merchants_Create.initialStatus')} error={errors.status}>
                                <StatusPicker value={data.status} onChange={(v) => setData('status', v)} />
                            </Field>
                        </FormSection>

                    </div>

                    {/* ── Right: sidebar ── */}
                    <div className="space-y-4">

                        {/* Action card */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4">{i18n.t('generated.merchants_Create.createMerchant')}</h3>
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
                                {processing ? i18n.t('generated.common.creating') : i18n.t('generated.common.createMerchant')}
                            </button>
                            <Link
                                href={route('admin.merchants.index')}
                                className="mt-3 block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >{i18n.t('common.actions.cancel')}</Link>
                        </div>

                        {/* What happens next */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                            <h4 className="text-sm font-semibold text-blue-900 mb-3">{i18n.t('generated.merchants_Create.whatHappensNext')}</h4>
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
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">{i18n.t('generated.merchants_Create.statusGuide')}</h4>
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
