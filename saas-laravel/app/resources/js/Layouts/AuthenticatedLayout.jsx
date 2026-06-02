import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

// ── Inline Icons (Heroicons outline style) ───────────────────────────────────

function IconGrid({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    );
}

function IconCreditCard({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
    );
}

function IconKey({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
    );
}

function IconStar({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
    );
}

function IconBolt({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    );
}


function IconLogout({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
    );
}

function IconChevronLeft({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
    );
}

function IconChevronRight({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
    );
}

function IconMenu({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
    );
}

function IconX({ cls }) {
    return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { label: 'Dashboard',    routeName: 'dashboard',          pattern: 'dashboard',        Icon: IconGrid },
    { label: 'Payments',     routeName: 'payments.index',     pattern: 'payments.*',       Icon: IconCreditCard },
    { label: 'API Keys',     routeName: 'api-keys.index',     pattern: 'api-keys.*',       Icon: IconKey },
    { label: 'Subscriptions',routeName: 'subscriptions.index',pattern: 'subscriptions.*',  Icon: IconStar },
    { label: 'API Requests', routeName: 'api-requests.index', pattern: 'api-requests.*',   Icon: IconBolt },
];

// ── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed }) {
    const isActive = route().current(item.pattern);
    const iconCls = 'w-5 h-5 shrink-0';

    return (
        <Link
            href={route(item.routeName)}
            title={collapsed ? item.label : undefined}
            className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                collapsed ? 'justify-center' : '',
                isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
            ].join(' ')}
        >
            <item.Icon cls={iconCls} />
            {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
    );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
    const user = usePage().props.auth.user;
    const initials = (user?.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={onCloseMobile}
                    aria-hidden="true"
                />
            )}

            <aside
                className={[
                    'fixed inset-y-0 left-0 z-30 flex flex-col bg-slate-900 text-white',
                    'transition-[width,transform] duration-300 ease-in-out',
                    collapsed ? 'w-16' : 'w-64',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                ].join(' ')}
            >
                {/* Logo row */}
                <div className={[
                    'flex h-16 shrink-0 items-center border-b border-slate-700/50',
                    collapsed ? 'justify-center px-0' : 'justify-between px-4',
                ].join(' ')}>
                    {collapsed ? (
                        <Link href="/" className="text-lg font-black text-indigo-400 tracking-tight">P</Link>
                    ) : (
                        <Link href="/" className="text-xl font-bold text-white tracking-tight">
                            PayFlow<span className="text-indigo-400">.io</span>
                        </Link>
                    )}

                    {/* Desktop collapse toggle */}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed
                            ? <IconChevronRight cls="w-4 h-4" />
                            : <IconChevronLeft cls="w-4 h-4" />
                        }
                    </button>

                    {/* Mobile close button */}
                    <button
                        onClick={onCloseMobile}
                        className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <IconX cls="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
                    {!collapsed && (
                        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500 select-none">
                            Menu
                        </p>
                    )}
                    {NAV_ITEMS.map(item => (
                        <NavItem key={item.routeName} item={item} collapsed={collapsed} />
                    ))}
                </nav>

                {/* User section */}
                <div className="shrink-0 border-t border-slate-700/50 p-2 space-y-0.5">
                    <Link
                        href={route('profile.edit')}
                        title={collapsed ? user?.name : undefined}
                        className={[
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                            collapsed ? 'justify-center' : '',
                            route().current('profile.*')
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700/60 hover:text-white',
                        ].join(' ')}
                    >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                            {initials}
                        </span>
                        {!collapsed && (
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-white">{user?.name}</span>
                                <span className="block truncate text-xs text-slate-400">{user?.email}</span>
                            </span>
                        )}
                    </Link>

                    {/* Logout */}
                    <button
                        onClick={() => router.post(route('logout'))}
                        title={collapsed ? 'Log out' : undefined}
                        className={[
                            'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors duration-150',
                            collapsed ? 'justify-center' : '',
                        ].join(' ')}
                    >
                        <IconLogout cls="w-5 h-5 shrink-0" />
                        {!collapsed && <span>Log out</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AuthenticatedLayout({ header, children }) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch {}
    }, [collapsed]);

    const sidebarWidth = collapsed ? 'lg:pl-16' : 'lg:pl-64';

    return (
        <>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

            <div className="flex min-h-screen bg-gray-50">
                <Sidebar
                    collapsed={collapsed}
                    onToggleCollapse={() => setCollapsed(c => !c)}
                    mobileOpen={mobileOpen}
                    onCloseMobile={() => setMobileOpen(false)}
                />

                {/* Main area — offset by sidebar width on desktop */}
                <div className={['flex flex-1 flex-col min-w-0 transition-[padding] duration-300 ease-in-out', sidebarWidth].join(' ')}>

                    {/* Mobile top bar */}
                    <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                            <IconMenu cls="w-5 h-5" />
                        </button>
                        <Link href="/" className="ml-3 text-xl font-bold text-gray-900">
                            PayFlow<span className="text-indigo-600">.io</span>
                        </Link>
                    </div>

                    {/* Optional page header */}
                    {header && (
                        <div className="border-b border-gray-200 bg-white px-6 py-4">
                            {header}
                        </div>
                    )}

                    <main className="flex-1">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
