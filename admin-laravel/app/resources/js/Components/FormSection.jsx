/**
 * FormSection — a white card section used inside forms.
 *
 * Props:
 *   title       {string}  — section heading
 *   description {string}  — optional subtitle
 *   actions     {node}    — optional JSX rendered top-right (e.g. a save button)
 *   children    {node}    — form fields
 */
export default function FormSection({ title, description, children, actions }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                    )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>
            <div className="space-y-5 px-6 py-5">{children}</div>
        </div>
    );
}
