import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';

import i18n from '@/i18n';
function ProfileField({ id, label, error, children }) {
    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            {children}
            <InputError className="mt-2" message={error} />
        </div>
    );
}

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}) {
    const user = usePage().props.auth.user;
    const form = useForm({
        _method: 'patch',
        name: user.name ?? '',
        email: user.email ?? '',
        company_name: user.company_name ?? '',
        legal_name: user.legal_name ?? '',
        logo: null,
        remove_logo: false,
        website: user.website ?? '',
        phone: user.phone ?? '',
        tax_id: user.tax_id ?? '',
        country: user.country ?? '',
        city: user.city ?? '',
        postal_code: user.postal_code ?? '',
        address_line1: user.address_line1 ?? '',
        address_line2: user.address_line2 ?? '',
    });

    const logoPreview = useMemo(
        () => form.data.logo ? URL.createObjectURL(form.data.logo) : (!form.data.remove_logo ? user.logo_url : null),
        [form.data.logo, form.data.remove_logo, user.logo_url],
    );

    const submit = (event) => {
        event.preventDefault();
        form.post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.setData('logo', null),
        });
    };

    const input = (field, props = {}) => (
        <TextInput
            id={field}
            className="mt-1 block w-full"
            value={form.data[field]}
            onChange={(event) => form.setData(field, event.target.value)}
            {...props}
        />
    );

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">{i18n.t('generated.profile_UpdateProfileInformationForm.merchantProfile')}</h2>
                <p className="mt-1 text-sm text-gray-600">{i18n.t('generated.profile_UpdateProfileInformationForm.manageYourAccountContactAndTheBusinessDetails')}</p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-8">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{i18n.t('generated.profile_UpdateProfileInformationForm.brand')}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-5">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 text-2xl font-semibold text-gray-400">
                            {logoPreview
                                ? <img src={logoPreview} alt={i18n.t('generated.profile_UpdateProfileInformationForm.companyLogoPreview')} className="h-full w-full object-contain" />
                                : (form.data.company_name || form.data.name).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-2">
                            <input
                                id="logo"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) => {
                                    form.setData('logo', event.target.files?.[0] ?? null);
                                    form.setData('remove_logo', false);
                                }}
                                className="block text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            <p className="text-xs text-gray-500">{i18n.t('generated.profile_UpdateProfileInformationForm.jpgPngOrWebpUpTo2Mb')}</p>
                            {user.logo_url && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        form.setData('logo', null);
                                        form.setData('remove_logo', true);
                                    }}
                                    className="text-xs font-medium text-red-600 hover:text-red-700"
                                >{i18n.t('generated.profile_UpdateProfileInformationForm.removeCurrentLogo')}</button>
                            )}
                            <InputError message={form.errors.logo} />
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{i18n.t('generated.profile_UpdateProfileInformationForm.accountContact')}</h3>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <ProfileField id="name" label={i18n.t('generated.profile_UpdateProfileInformationForm.contactName')} error={form.errors.name}>
                            {input('name', { required: true, autoComplete: 'name' })}
                        </ProfileField>
                        <ProfileField id="email" label={i18n.t('generated.profile_UpdateProfileInformationForm.email')} error={form.errors.email}>
                            {input('email', { type: 'email', required: true, autoComplete: 'username' })}
                        </ProfileField>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{i18n.t('generated.profile_UpdateProfileInformationForm.companyDetails')}</h3>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <ProfileField id="company_name" label={i18n.t('generated.profile_UpdateProfileInformationForm.tradingName')} error={form.errors.company_name}>
                            {input('company_name', { placeholder: i18n.t('generated.profile_UpdateProfileInformationForm.acmePayments') })}
                        </ProfileField>
                        <ProfileField id="legal_name" label={i18n.t('generated.profile_UpdateProfileInformationForm.legalCompanyName')} error={form.errors.legal_name}>
                            {input('legal_name', { placeholder: i18n.t('generated.profile_UpdateProfileInformationForm.acmePaymentsLtd') })}
                        </ProfileField>
                        <ProfileField id="website" label={i18n.t('generated.profile_UpdateProfileInformationForm.website')} error={form.errors.website}>
                            {input('website', { type: 'url', placeholder: 'https://example.com' })}
                        </ProfileField>
                        <ProfileField id="phone" label={i18n.t('generated.profile_UpdateProfileInformationForm.phone')} error={form.errors.phone}>
                            {input('phone', { type: 'tel', placeholder: '+359 2 123 4567' })}
                        </ProfileField>
                        <ProfileField id="tax_id" label={i18n.t('generated.profile_UpdateProfileInformationForm.taxVatId')} error={form.errors.tax_id}>
                            {input('tax_id')}
                        </ProfileField>
                        <ProfileField id="country" label={i18n.t('generated.profile_UpdateProfileInformationForm.countryCode')} error={form.errors.country}>
                            {input('country', { maxLength: 2, placeholder: 'BG' })}
                        </ProfileField>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{i18n.t('generated.profile_UpdateProfileInformationForm.businessAddress')}</h3>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                        <ProfileField id="address_line1" label={i18n.t('generated.profile_UpdateProfileInformationForm.addressLine1')} error={form.errors.address_line1}>
                            {input('address_line1')}
                        </ProfileField>
                        <ProfileField id="address_line2" label={i18n.t('generated.profile_UpdateProfileInformationForm.addressLine2')} error={form.errors.address_line2}>
                            {input('address_line2')}
                        </ProfileField>
                        <ProfileField id="city" label={i18n.t('generated.profile_UpdateProfileInformationForm.city')} error={form.errors.city}>
                            {input('city')}
                        </ProfileField>
                        <ProfileField id="postal_code" label={i18n.t('generated.profile_UpdateProfileInformationForm.postalCode')} error={form.errors.postal_code}>
                            {input('postal_code')}
                        </ProfileField>
                    </div>
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="text-sm text-gray-800">{i18n.t('generated.profile_UpdateProfileInformationForm.yourEmailAddressIsUnverified')}{' '}
                        <Link href={route('verification.send')} method="post" as="button" className="underline">{i18n.t('generated.profile_UpdateProfileInformationForm.reSendTheVerificationEmail')}</Link>
                        {status === 'verification-link-sent' && (
                            <p className="mt-2 font-medium text-green-600">{i18n.t('generated.profile_UpdateProfileInformationForm.aNewVerificationLinkHasBeenSent')}</p>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={form.processing}>{i18n.t('generated.profile_UpdateProfileInformationForm.saveProfile')}</PrimaryButton>
                    <Transition show={form.recentlySuccessful} enter="transition ease-in-out" enterFrom="opacity-0" leave="transition ease-in-out" leaveTo="opacity-0">
                        <p className="text-sm text-gray-600">{i18n.t('generated.profile_UpdateProfileInformationForm.saved')}</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
