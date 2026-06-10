const colors = {
    success:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    healthy:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    error:     'bg-red-50 text-red-600 border-red-200',
    failed:    'bg-red-50 text-red-600 border-red-200',
    unhealthy: 'bg-red-50 text-red-600 border-red-200',
    warning:   'bg-amber-50 text-amber-700 border-amber-200',
    degraded:  'bg-amber-50 text-amber-700 border-amber-200',
    draft:     'bg-amber-50 text-amber-700 border-amber-200',
    archived:  'bg-slate-100 text-slate-500 border-slate-200',
    disabled:  'bg-slate-100 text-slate-500 border-slate-200',
    default:   'bg-slate-100 text-slate-600 border-slate-200',
};

export default function Badge({ children, variant = 'default' }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[variant] ?? colors.default}`}>
            {children}
        </span>
    );
}
