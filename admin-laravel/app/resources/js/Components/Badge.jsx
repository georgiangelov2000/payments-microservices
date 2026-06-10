/**
 * Badge — status badge with semantic color variants.
 *
 * Props:
 *   value    {string}          — status string to display
 *   size     {'sm'|'md'}       — text/padding size (default 'md')
 *   dot      {boolean}         — show a small colored dot before the label
 *   className {string}         — extra classes
 */

const colorMap = {
    // green
    active:      'green',
    validated:   'green',
    healthy:     'green',
    succeeded:   'green',
    published:   'green',
    completed:   'green',
    // amber
    pending:     'amber',
    degraded:    'amber',
    // slate/gray
    inactive:    'slate',
    disabled:    'slate',
    unknown:     'slate',
    // red
    suspended:   'red',
    failed:      'red',
    unhealthy:   'red',
    timeout:     'red',
    declined:    'red',
    // blue
    draft:       'blue',
    test:        'blue',
    // violet
    live:        'violet',
    production:  'violet',
    // indigo
    processing:  'indigo',
};

const themeClasses = {
    green:  'bg-green-50 text-green-700 border-green-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const dotClasses = {
    green:  'bg-green-500',
    amber:  'bg-amber-500',
    slate:  'bg-slate-400',
    red:    'bg-red-500',
    blue:   'bg-blue-500',
    violet: 'bg-violet-500',
    indigo: 'bg-indigo-500',
};

export default function Badge({ value = '', label: labelOverride, size = 'md', dot = false, className = '' }) {
    const key = String(value).toLowerCase().trim();
    const color = colorMap[key] ?? 'slate';
    const theme = themeClasses[color];
    const dotColor = dotClasses[color];

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5 text-xs'
        : 'px-2.5 py-0.5 text-xs';

    const label = labelOverride ?? (value
        ? String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()
        : '');

    return (
        <span className={[
            'inline-flex items-center gap-1.5 rounded-full border font-medium',
            theme,
            sizeClasses,
            className,
        ].join(' ')}>
            {dot && (
                <span className={['h-1.5 w-1.5 rounded-full shrink-0', dotColor].join(' ')} />
            )}
            {label}
        </span>
    );
}
