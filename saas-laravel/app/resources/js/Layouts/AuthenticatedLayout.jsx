import { Link, usePage, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
    LayoutDashboard,
    CreditCard,
    Key,
    Package,
    BarChart2,
    Webhook,
    GitBranch,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Zap,
} from 'lucide-react';

// ── Nav config ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { label: 'Dashboard',    routeName: 'dashboard',           pattern: 'dashboard',          Icon: LayoutDashboard },
    { label: 'Payments',     routeName: 'payments.index',      pattern: 'payments.*',         Icon: CreditCard },
    { label: 'Analytics',    routeName: 'analytics',           pattern: 'analytics',          Icon: BarChart2 },
    { label: 'Routing',      routeName: 'routing.index',       pattern: 'routing.*',          Icon: GitBranch },
    { label: 'API Keys',     routeName: 'api-keys.index',      pattern: 'api-keys.*',         Icon: Key },
    { label: 'Subscriptions',routeName: 'subscriptions.index', pattern: 'subscriptions.*',    Icon: Package },
    { label: 'Webhooks',     routeName: 'webhooks.index',      pattern: 'webhooks.*',         Icon: Webhook },
];

// ── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed }) {
    const isActive = route().current(item.pattern);
    const { Icon } = item;

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
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
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
                        <Link href="/" className="text-indigo-400">
                            <Zap size={20} strokeWidth={2} fill="currentColor" />
                        </Link>
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
                            ? <ChevronRight size={14} strokeWidth={2} />
                            : <ChevronLeft size={14} strokeWidth={2} />
                        }
                    </button>

                    {/* Mobile close button */}
                    <button
                        onClick={onCloseMobile}
                        className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <X size={14} strokeWidth={2} />
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
                        <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
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

                <div className={['flex flex-1 flex-col min-w-0 transition-[padding] duration-300 ease-in-out', sidebarWidth].join(' ')}>

                    {/* Mobile top bar */}
                    <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 lg:hidden">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                            <Menu size={20} strokeWidth={1.75} />
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
