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
    openai: {
        label: 'OpenAI',
        aliases: ['openai', 'open-ai', 'gpt', 'chatgpt'],
        colors: {
            bg: 'bg-[#111827]',
            text: 'text-white',
            ring: 'ring-slate-300/40',
            soft: 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700',
        },
        mark: 'openai',
    },
    anthropic: {
        label: 'Anthropic',
        aliases: ['anthropic', 'claude'],
        colors: {
            bg: 'bg-[#191919]',
            text: 'text-white',
            ring: 'ring-stone-300/40',
            soft: 'bg-stone-100 text-stone-900 border-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700',
        },
        mark: 'anthropic',
    },
    google: {
        label: 'Google',
        aliases: ['google', 'google-ai', 'gemini', 'vertex-ai'],
        colors: {
            bg: 'bg-white',
            text: 'text-slate-900',
            ring: 'ring-slate-200',
            soft: 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700',
        },
        mark: 'google',
    },
    mistral: {
        label: 'Mistral AI',
        aliases: ['mistral', 'mistral-ai'],
        colors: {
            bg: 'bg-[#ff7000]',
            text: 'text-white',
            ring: 'ring-orange-300/40',
            soft: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-800',
        },
        mark: 'mistral',
    },
    cohere: {
        label: 'Cohere',
        aliases: ['cohere'],
        colors: {
            bg: 'bg-[#39594d]',
            text: 'text-white',
            ring: 'ring-emerald-300/40',
            soft: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800',
        },
        mark: 'cohere',
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

    if (mark === 'openai') {
        return (
            <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
                <g fill="none" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M24 7.8c4.6-2.6 10.4-.1 11.5 5.1 4.7.9 7.4 5.9 5.4 10.3 3.4 3.6 2.3 9.6-2.2 11.9-.4 5.2-5.4 8.6-10.3 6.9-4.2 3.1-10.1 1.5-11.8-3.4-5.1-.9-8.2-5.7-6.5-10.6-3.5-3.8-2.2-9.8 2.5-12 1-5.1 6.3-8.2 11.4-8.2Z" opacity=".95" />
                    <path d="M17.4 14.4 30 21.7v14.6" />
                    <path d="m30.6 13.9-12.7 7.3-12.4 7.1" />
                    <path d="M11.8 28.2 24.4 35.5l12.4-7.2" />
                    <path d="M36.2 19.8 23.6 12.5" />
                    <path d="M24 20.6v14.2" />
                </g>
            </svg>
        );
    }

    if (mark === 'anthropic') {
        return (
            <svg viewBox="0 0 64 48" aria-hidden="true" className={className}>
                <path fill="currentColor" d="M12 37 25.8 10h6.4L18.4 37H12Zm23.7 0-3.4-7.1H20.9l2.7-5.4h6.2L25.7 16h6.2L42.2 37h-6.5Zm10.1 0V10h6.2v27h-6.2Z" />
            </svg>
        );
    }

    if (mark === 'google') {
        return (
            <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
                <path fill="#4285F4" d="M41.6 24.5c0-1.2-.1-2.3-.3-3.4H24v6.5h9.9c-.4 2.3-1.8 4.2-3.8 5.5v4.5h6.1c3.5-3.3 5.4-8.1 5.4-13.6Z" />
                <path fill="#34A853" d="M24 42c4.9 0 9.1-1.6 12.1-4.4l-6.1-4.5c-1.7 1.1-3.8 1.8-6.1 1.8-4.7 0-8.8-3.2-10.2-7.5H7.5V32c3 5.9 9.1 10 16.5 10Z" />
                <path fill="#FBBC05" d="M13.8 27.4c-.4-1.1-.6-2.2-.6-3.4s.2-2.3.6-3.4V16H7.5A17.9 17.9 0 0 0 6 24c0 2.9.7 5.6 1.9 8l5.9-4.6Z" />
                <path fill="#EA4335" d="M24 13.1c2.7 0 5.1.9 7 2.7l5.2-5.2C33.1 7.7 28.9 6 24 6 16.6 6 10.5 10.1 7.5 16l6.3 4.6c1.4-4.3 5.5-7.5 10.2-7.5Z" />
            </svg>
        );
    }

    if (mark === 'mistral') {
        return (
            <svg viewBox="0 0 56 48" aria-hidden="true" className={className}>
                <path fill="#ffd42a" d="M8 8h8v8H8zM40 8h8v8h-8zM16 16h8v8h-8zM32 16h8v8h-8z" />
                <path fill="#ff7000" d="M8 16h8v24H8zM40 16h8v24h-8zM24 24h8v8h-8z" />
                <path fill="#111827" d="M16 24h8v16h-8zM32 24h8v16h-8z" opacity=".9" />
            </svg>
        );
    }

    if (mark === 'cohere') {
        return (
            <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
                <circle cx="18" cy="18" r="10" fill="currentColor" opacity=".95" />
                <circle cx="31" cy="17" r="6" fill="currentColor" opacity=".62" />
                <path fill="currentColor" d="M17 28h15c4.5 0 8 3 8 7s-3.5 7-8 7H17V28Z" opacity=".78" />
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
