import { CreditCard } from 'lucide-react';

const PROVIDERS = {
    stripe: {
        label: 'Stripe',
        aliases: ['stripe'],
        colors: {
            bg: 'bg-[#635bff]',
            text: 'text-white',
            ring: 'ring-[#635bff]/20',
            soft: 'bg-[#635bff]/10 text-[#3f38d6] border-[#635bff]/20 dark:text-[#b8b5ff]',
        },
        mark: 'stripe',
    },
    paypal: {
        label: 'PayPal',
        aliases: ['paypal', 'pay-pal'],
        colors: {
            bg: 'bg-[#003087]',
            text: 'text-white',
            ring: 'ring-[#0070ba]/20',
            soft: 'bg-[#0070ba]/10 text-[#003087] border-[#0070ba]/20 dark:text-[#8fc7ff]',
        },
        mark: 'paypal',
    },
    mypos: {
        label: 'myPOS',
        aliases: ['mypos', 'my-pos', 'my_pos'],
        colors: {
            bg: 'bg-[#00a3e0]',
            text: 'text-white',
            ring: 'ring-[#00a3e0]/20',
            soft: 'bg-[#00a3e0]/10 text-[#006b93] border-[#00a3e0]/20 dark:text-[#86dcff]',
        },
        mark: 'mypos',
    },
    epay: {
        label: 'ePay.bg',
        aliases: ['epay', 'epaybg', 'epay.bg', 'e-pay'],
        colors: {
            bg: 'bg-[#1282c4]',
            text: 'text-white',
            ring: 'ring-[#1282c4]/20',
            soft: 'bg-[#1282c4]/10 text-[#0b5d8d] border-[#1282c4]/20 dark:text-[#9bd7ff]',
        },
        mark: 'epay',
    },
    borica: {
        label: 'BORICA',
        aliases: ['borica', 'borika'],
        colors: {
            bg: 'bg-[#e30613]',
            text: 'text-white',
            ring: 'ring-[#e30613]/20',
            soft: 'bg-[#e30613]/10 text-[#a8050e] border-[#e30613]/20 dark:text-[#ffb4b9]',
        },
        mark: 'borica',
    },
};

function normalizeAlias(alias) {
    return String(alias || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');
}

export function getProviderMeta(alias, fallbackLabel = null) {
    const normalized = normalizeAlias(alias);
    const match = Object.values(PROVIDERS).find((provider) => provider.aliases.includes(normalized));

    if (match) {
        return match;
    }

    const label = fallbackLabel || alias || 'Provider';

    return {
        label,
        aliases: [normalized],
        colors: {
            bg: 'bg-slate-700',
            text: 'text-white',
            ring: 'ring-slate-300/40',
            soft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        },
        mark: 'fallback',
    };
}

function ProviderMark({ mark, className = '' }) {
    if (mark === 'stripe') {
        return (
            <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
                <path fill="currentColor" d="M38.7 14.7c-2.5-1-5-1.5-7.5-1.5-5.8 0-9.4 3-9.4 7.2 0 6.4 8.8 5.4 8.8 8.2 0 1.1-1 1.7-2.9 1.7-2.6 0-5.8-1.1-8-2.5v6.9c2.9 1.2 5.9 1.8 8.6 1.8 6 0 10.1-3 10.1-7.5 0-6.9-8.9-5.7-8.9-8.3 0-.9.8-1.5 2.6-1.5 2 0 4.7.8 6.7 2v-6.5Zm-20.4-.9h-6.9v21.9h6.9V13.8Zm0-7.6-6.9 1.5v4.5h6.9v-6Z" />
            </svg>
        );
    }

    if (mark === 'paypal') {
        return (
            <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
                <path fill="currentColor" opacity=".95" d="M17.3 8.6h12.4c4.7 0 8.1 3.4 7.4 8.3-.8 6.3-4.8 9.9-11 9.9h-3.6l-1.4 8.9h-6.5l2.7-27.1Z" />
                <path fill="currentColor" opacity=".62" d="M21.3 15.5h12.1c4.4 0 7.4 3.1 6.7 7.7-.8 5.9-4.6 9.2-10.4 9.2h-3.4l-1.2 7H18.6l2.7-23.9Z" />
                <path fill="#fff" d="M23.6 20.7h4.7c2.6 0 4.1 1.3 3.8 3.4-.3 2.4-2 3.7-4.6 3.7h-5l1.1-7.1Z" opacity=".9" />
            </svg>
        );
    }

    if (mark === 'mypos') {
        return (
            <svg viewBox="0 0 56 48" aria-hidden="true" className={className}>
                <rect x="8" y="12" width="40" height="24" rx="7" fill="currentColor" opacity=".92" />
                <circle cx="20" cy="24" r="5" fill="#fff" opacity=".92" />
                <path fill="#fff" d="M29 19h11v4H29v-4Zm0 6h8v4h-8v-4Z" opacity=".92" />
            </svg>
        );
    }

    if (mark === 'epay') {
        return (
            <svg viewBox="0 0 56 48" aria-hidden="true" className={className}>
                <path fill="currentColor" d="M13 25.4c0-7.3 5.4-12.4 12.7-12.4 7.5 0 12.4 5.2 12.4 13.3v1.4H20.3c.7 2.5 2.8 3.9 6.1 3.9 2.6 0 5-.7 7.2-2.1l3 4.7c-2.9 2.1-6.3 3.1-10.3 3.1-7.8 0-13.3-5-13.3-11.9Zm7.4-2.5h10.4c-.4-2.6-2.2-4.1-5-4.1-2.7 0-4.7 1.6-5.4 4.1Z" />
                <path fill="currentColor" opacity=".45" d="M40.5 15.4h5.8v20.9h-5.8z" />
            </svg>
        );
    }

    if (mark === 'borica') {
        return (
            <svg viewBox="0 0 56 48" aria-hidden="true" className={className}>
                <path fill="currentColor" d="M12 12h18.2c5.2 0 8.5 2.8 8.5 7.1 0 2.4-1.2 4.5-3.5 5.7 3 1.1 4.8 3.3 4.8 6.3 0 4.6-3.6 7.9-9.5 7.9H12V12Zm15.9 10.5c2.2 0 3.4-.9 3.4-2.5s-1.2-2.5-3.4-2.5h-8.3v5h8.3Zm1 10.9c2.4 0 3.7-1 3.7-2.8s-1.3-2.8-3.7-2.8h-9.3v5.6h9.3Z" />
                <path fill="currentColor" opacity=".45" d="M42 12h4v27h-4z" />
            </svg>
        );
    }

    return (
        <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
            <CreditCard size="70%" strokeWidth={2.2} />
        </span>
    );
}

const sizeClasses = {
    xs: 'h-5 w-5',
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
};

export function ProviderIcon({ alias, label, size = 'sm', className = '' }) {
    const meta = getProviderMeta(alias, label);

    return (
        <span
            title={meta.label}
            className={`inline-flex shrink-0 items-center justify-center rounded-lg ${sizeClasses[size] || sizeClasses.sm} ${meta.colors.bg} ${meta.colors.text} shadow-sm ring-4 ${meta.colors.ring} ${className}`}
        >
            <ProviderMark mark={meta.mark} className="h-[72%] w-[72%]" />
        </span>
    );
}

export default function ProviderBrand({
    alias,
    label,
    status,
    size = 'sm',
    variant = 'badge',
    showLabel = true,
    className = '',
}) {
    const meta = getProviderMeta(alias, label);

    if (variant === 'icon') {
        return <ProviderIcon alias={alias} label={label} size={size} className={className} />;
    }

    const compact = variant === 'compact';
    const textSize = compact ? 'text-xs' : 'text-sm';
    const padding = compact ? 'gap-1.5 rounded-lg px-2 py-1' : 'gap-2 rounded-xl px-2.5 py-1.5';

    return (
        <span className={`inline-flex min-w-0 items-center border ${padding} ${meta.colors.soft} ${className}`}>
            <ProviderIcon alias={alias} label={label} size={compact ? 'xs' : size} className="ring-0 shadow-none" />
            {showLabel && (
                <span className={`truncate font-semibold ${textSize}`}>
                    {meta.label}
                </span>
            )}
            {status && (
                <span className="ml-0.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-60" title={status} />
            )}
        </span>
    );
}
