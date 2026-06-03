/**
 * Card — white content container with optional header and body sections.
 *
 * Exports:
 *   Card       — full card wrapper (title, description, actions, children)
 *   CardHeader — standalone header section
 *   CardBody   — standalone body section
 *
 * Props (Card):
 *   title       {string}   — card heading
 *   description {string}   — subtitle below the title
 *   actions     {node}     — JSX rendered in the header top-right
 *   className   {string}   — extra wrapper classes
 *   noPadding   {boolean}  — omit default body padding
 *   children    {node}     — card content
 */

export function CardHeader({ title, description, actions, className = '' }) {
    if (!title && !description && !actions) return null;
    return (
        <div className={[
            'flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4',
            className,
        ].join(' ')}>
            <div className="min-w-0">
                {title && (
                    <h3 className="text-base font-semibold text-slate-900 truncate">{title}</h3>
                )}
                {description && (
                    <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
        </div>
    );
}

export function CardBody({ className = '', children }) {
    return (
        <div className={['p-6', className].join(' ')}>
            {children}
        </div>
    );
}

export function Card({
    title,
    description,
    actions,
    className = '',
    noPadding = false,
    children,
}) {
    const hasHeader = title || description || actions;

    return (
        <div className={[
            'rounded-xl border border-slate-200 bg-white shadow-sm',
            className,
        ].join(' ')}>
            {hasHeader && (
                <CardHeader title={title} description={description} actions={actions} />
            )}
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    );
}

export default Card;
