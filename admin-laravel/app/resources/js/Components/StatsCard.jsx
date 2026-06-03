/**
 * StatsCard — KPI metric card with optional icon, trend, and link.
 *
 * Props:
 *   label   {string}                          — metric label
 *   value   {string|number}                   — primary metric value
 *   subtext {string}                          — secondary line below value
 *   href    {string}                          — optional link URL
 *   icon    {node}                            — optional JSX icon
 *   trend   {'up'|'down'|null}                — trend direction
 *   trendValue {string}                       — e.g. "+12%" shown with trend arrow
 *   color   {'default'|'green'|'red'|'amber'|'indigo'} — icon circle color
 */
import { Link } from '@inertiajs/react';

const iconBg = {
    default: 'bg-slate-100 text-slate-600',
    green:   'bg-green-100 text-green-600',
    red:     'bg-red-100 text-red-600',
    amber:   'bg-amber-100 text-amber-600',
    indigo:  'bg-indigo-100 text-indigo-600',
};

function TrendUp() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3.5 w-3.5">
            <polyline points="18 15 12 9 6 15" />
        </svg>
    );
}

function TrendDown() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-3.5 w-3.5">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function ArrowRight() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

export default function StatsCard({
    label,
    value,
    subtext,
    href,
    icon,
    trend = null,
    trendValue,
    color = 'default',
}) {
    const iconColorClass = iconBg[color] ?? iconBg.default;

    const content = (
        <div className={[
            'group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-150',
            href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : '',
        ].join(' ')}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>

                    <div className="mt-2 flex items-center gap-2">
                        {trend && (
                            <span className={[
                                'inline-flex items-center gap-0.5 text-xs font-medium',
                                trend === 'up' ? 'text-green-600' : 'text-red-600',
                            ].join(' ')}>
                                {trend === 'up' ? <TrendUp /> : <TrendDown />}
                                {trendValue}
                            </span>
                        )}
                        {subtext && (
                            <span className="text-xs text-slate-500">{subtext}</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    {icon && (
                        <div className={[
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            iconColorClass,
                        ].join(' ')}>
                            {icon}
                        </div>
                    )}
                    {href && (
                        <span className="text-slate-300 transition-colors group-hover:text-indigo-600">
                            <ArrowRight />
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }

    return content;
}
