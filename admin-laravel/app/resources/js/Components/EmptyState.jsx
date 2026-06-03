/**
 * EmptyState — centered placeholder for empty lists/tables.
 *
 * Props:
 *   icon        {node}    — JSX icon element (displayed in a gray circle)
 *   title       {string}  — heading text
 *   description {string}  — supporting body copy
 *   action      {node}    — optional CTA button/link
 */

export default function EmptyState({ icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            {icon && (
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    {icon}
                </div>
            )}

            {title && (
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            )}

            {description && (
                <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
            )}

            {action && (
                <div className="mt-6">{action}</div>
            )}
        </div>
    );
}
