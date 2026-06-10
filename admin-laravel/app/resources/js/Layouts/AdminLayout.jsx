/**
 * AdminLayout — collapsible sidebar layout for the PayFlow admin panel.
 *
 * Props:
 *   title    {string}  — page title shown in the header bar
 *   children {node}   — main content
 *   actions  {node}   — optional JSX rendered top-right in the header
 */
import { useState, useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Package,
    Key,
    GitBranch,
    BarChart2,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Zap,
} from 'lucide-react';

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems = [
    { labelKey: 'common.nav.dashboard',     routeName: 'admin.dashboard',           pattern: 'admin.dashboard',        Icon: LayoutDashboard },
    { labelKey: 'common.nav.merchants',     routeName: 'admin.merchants.index',     pattern: 'admin.merchants.*',      Icon: Users },
    { labelKey: 'common.nav.payments',      routeName: 'admin.payments.index',      pattern: 'admin.payments.*',       Icon: CreditCard },
    { labelKey: 'common.nav.subscriptions', routeName: 'admin.subscriptions.index', pattern: 'admin.subscriptions.*',  Icon: Package },
    { labelKey: 'common.nav.apiKeys',       routeName: 'admin.api-keys.index',      pattern: 'admin.api-keys.*',       Icon: Key },
    { labelKey: 'common.nav.routing',       routeName: 'admin.routing.index',       pattern: 'admin.routing.*',        Icon: GitBranch },
    { labelKey: 'common.nav.analytics',     routeName: 'admin.analytics.index',     pattern: 'admin.analytics.*',      Icon: BarChart2 },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed }) {
    const active = route().current(item.pattern);
    const { Icon } = item;
    const { t } = useTranslation();
    const label = t(item.labelKey);

    return (
        <Link
            href={route(item.routeName)}
            title={collapsed ? label : undefined}
            className={[
                'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'px-3',
                active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
            ].join(' ')}
        >
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
        </Link>
    );
}

// ─── Sidebar inner content ────────────────────────────────────────────────────

function SidebarContent({ collapsed, onCollapse, user }) {
    const { t } = useTranslation();
    const initials = user?.name
        ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
        : 'A';

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Brand */}
            <div className={[
                'flex items-center border-b border-slate-800 py-4 shrink-0',
                collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
            ].join(' ')}>
                <div className="text-indigo-400 shrink-0">
                    <Zap size={22} strokeWidth={2} fill="currentColor" />
                </div>
                {!collapsed && (
                    <Link
                        href={route('admin.dashboard')}
                        className="text-lg font-bold tracking-tight text-white truncate"
                    >
                        PayFlow
                    </Link>
                )}
            </div>

            {/* Nav */}
            <nav className={[
                'flex-1 space-y-0.5 overflow-y-auto py-4',
                collapsed ? 'px-2' : 'px-3',
            ].join(' ')}>
                {!collapsed && (
                    <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-600 select-none">
                        {t('common.layout.platform')}
                    </p>
                )}
                {navItems.map((item) => (
                    <NavItem key={item.routeName} item={item} collapsed={collapsed} />
                ))}
            </nav>

            {/* User + actions */}
            <div className={[
                'border-t border-slate-800 py-4 shrink-0',
                collapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-3 space-y-1',
            ].join(' ')}>
                {/* User info */}
                {collapsed ? (
                    <div
                        title={user?.name}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white"
                    >
                        {initials}
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-semibold text-white">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                            <p className="truncate text-xs text-slate-400">{user?.email}</p>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <button
                    type="button"
                    onClick={() => router.post(route('admin.logout'))}
                    title={collapsed ? t('common.layout.logout') : undefined}
                    className={[
                        'flex w-full items-center gap-2 rounded-lg text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white',
                        collapsed ? 'justify-center p-2' : 'px-3 py-2',
                    ].join(' ')}
                >
                    <LogOut size={16} strokeWidth={1.75} className="shrink-0" />
                    {!collapsed && <span>{t('common.layout.logout')}</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    type="button"
                    onClick={onCollapse}
                    title={collapsed ? t('common.layout.expandSidebar') : t('common.layout.collapseSidebar')}
                    className={[
                        'flex w-full items-center gap-2 rounded-lg text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white',
                        collapsed ? 'justify-center p-2' : 'px-3 py-2',
                    ].join(' ')}
                >
                    {collapsed
                        ? <ChevronRight size={16} strokeWidth={2} className="shrink-0" />
                        : <><ChevronLeft size={16} strokeWidth={2} className="shrink-0" /><span>{t('common.layout.collapse')}</span></>
                    }
                </button>
            </div>
        </div>
    );
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function AdminLayout({ title, children, actions }) {
    const { auth } = usePage().props;
    const { t } = useTranslation();
    const user = auth?.user;

    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('admin-sidebar-collapsed') === 'true'; } catch { return false; }
    });

    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => { setMobileOpen(false); }, [usePage().url]);

    const handleCollapse = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem('admin-sidebar-collapsed', String(next)); } catch {}
            return next;
        });
    };

    const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';
    const mainPadding  = collapsed ? 'lg:pl-[72px]' : 'lg:pl-64';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">

            {/* ── Desktop sidebar ── */}
            <aside className={[
                'fixed inset-y-0 left-0 z-40 hidden flex-col bg-slate-900 transition-all duration-200 lg:flex',
                sidebarWidth,
            ].join(' ')}>
                <SidebarContent collapsed={collapsed} onCollapse={handleCollapse} user={user} />
            </aside>

            {/* ── Mobile overlay sidebar ── */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            className="absolute right-3 top-3 z-10 rounded-md p-1 text-slate-400 hover:text-white"
                        >
                            <X size={18} strokeWidth={2} />
                        </button>
                        <SidebarContent collapsed={false} onCollapse={() => setMobileOpen(false)} user={user} />
                    </aside>
                </div>
            )}

            {/* ── Main area ── */}
            <div className={['transition-all duration-200', mainPadding].join(' ')}>

                {/* Header */}
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
                    <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden shrink-0"
                            >
                                <Menu size={20} strokeWidth={2} />
                            </button>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {t('common.layout.adminPanel')}
                                </p>
                                <h1 className="truncate text-xl font-semibold text-slate-900">{title}</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {actions && (
                                <div className="flex items-center gap-2">{actions}</div>
                            )}
                            <LanguageSwitcher />
                            <div className="hidden text-right sm:block">
                                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                                <p className="text-xs text-slate-500">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="px-4 py-6 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
