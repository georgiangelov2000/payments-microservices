import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Sign in" />

            <div className="mx-auto max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Sign in to your account
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Manage payments, subscriptions, and billing.
                    </p>
                </div>

                {status && (
                    <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
                        {status}
                    </div>
                )}

                {/* Form */}
                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-lg border bg-white p-6 shadow-sm"
                >
                    <div>
                        <InputLabel htmlFor="email" value="Email address" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            autoComplete="username"
                            isFocused
                            onChange={(e) =>
                                setData('email', e.target.value)
                            }
                        />
                        <InputError message={errors.email} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="password" value="Password" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                        />
                        <InputError message={errors.password} className="mt-2" />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <Checkbox
                                name="remember"
                                checked={data.remember}
                                onChange={(e) =>
                                    setData('remember', e.target.checked)
                                }
                            />
                            <span className="ms-2 text-sm text-gray-600">
                                Remember me
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>

                    <PrimaryButton
                        className="w-full justify-center py-3 text-base"
                        disabled={processing}
                    >
                        Sign in
                    </PrimaryButton>
                </form>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-gray-600">
                    Don’t have an account?{' '}
                    <Link
                        href={route('register')}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        Create one
                    </Link>
                </p>
            </div>
        </GuestLayout>
    );
}
