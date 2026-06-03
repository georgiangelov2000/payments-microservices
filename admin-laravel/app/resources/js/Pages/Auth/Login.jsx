import { Head, useForm } from '@inertiajs/react';

export default function Login({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function submit(event) {
        event.preventDefault();
        post(route('admin.login.store'));
    }

    return (
        <>
            <Head title="Admin Login" />
            <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
                <section className="w-full max-w-md rounded-lg border border-white/10 bg-white p-8 text-slate-950 shadow-2xl">
                    <div className="mb-7">
                        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">PayFlow Admin</p>
                        <h1 className="mt-2 text-2xl font-bold">Sign in to operations</h1>
                        <p className="mt-2 text-sm text-slate-500">Only active admin users can access this application.</p>
                    </div>

                    {status && <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">{status}</div>}

                    <form onSubmit={submit} className="space-y-4">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Email</span>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="username"
                                autoFocus
                            />
                            {errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email}</span>}
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-slate-700">Password</span>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(event) => setData('password', event.target.value)}
                                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="current-password"
                            />
                            {errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password}</span>}
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={(event) => setData('remember', event.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Remember this admin session
                        </label>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Sign in
                        </button>
                    </form>
                </section>
            </main>
        </>
    );
}
