import PrimaryButton from '@/Components/PrimaryButton';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

import i18n from '@/i18n';
export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    const submit = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title={i18n.t('generated.auth_VerifyEmail.emailVerification')} />

            <div className="mb-4 text-sm text-gray-600">{i18n.t('generated.auth_VerifyEmail.thanksForSigningUpBeforeGettingStartedCould')}</div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-green-600">{i18n.t('generated.auth_VerifyEmail.aNewVerificationLinkHasBeenSentTo')}</div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex items-center justify-between">
                    <PrimaryButton disabled={processing}>{i18n.t('generated.auth_VerifyEmail.resendVerificationEmail')}</PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >{i18n.t('generated.auth_VerifyEmail.logOut')}</Link>
                </div>
            </form>
        </GuestLayout>
    );
}
