import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Payment SaaS" />

            <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
                {/* Header */}
                <header className="border-b bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                        <div className="text-xl font-bold">
                            PayFlow<span className="text-indigo-600">.io</span>
                        </div>

                        <nav className="flex gap-4">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="px-4 py-2 rounded-md text-gray-700 hover:text-indigo-600"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                    >
                                        Get started
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                {/* Hero */}
                <main className="flex-1">
                    <section className="mx-auto max-w-7xl px-6 py-24 text-center">
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                            Modern Payments for SaaS Businesses
                        </h1>

                        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
                            Accept payments, manage subscriptions, and automate
                            billing with a developer-friendly payment platform
                            built for scale.
                        </p>
                    </section>

                </main>

                {/* Footer */}
                <footer className="border-t bg-white py-6 text-center text-sm text-gray-500">
                    © {new Date().getFullYear()} PayFlow.io — All rights reserved
                </footer>
            </div>
        </>
    );
}

function Feature({ title, description }) {
    return (
        <div className="rounded-lg border p-6 text-center">
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-4 text-gray-600">{description}</p>
        </div>
    );
}
