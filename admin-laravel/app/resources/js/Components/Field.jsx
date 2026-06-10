/**
 * Field — form field wrapper with label, hint, and inline error display.
 *
 * Props:
 *   label    {string}   — field label text
 *   hint     {string}   — optional help text shown below the input
 *   error    {string}   — validation error message (overrides hint)
 *   required {boolean}  — shows a red asterisk next to the label
 *   children {node}     — the input element
 */
import { AlertTriangle } from 'lucide-react';

export default function Field({ label, hint, error, required = false, children }) {
    return (
        <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
                {label}
                {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && (
                <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
            )}
            {error && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle size={12} strokeWidth={2} />
                    {error}
                </p>
            )}
        </div>
    );
}
