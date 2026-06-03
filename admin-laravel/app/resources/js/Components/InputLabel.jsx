/**
 * InputLabel — form field label with optional required indicator.
 *
 * Props:
 *   htmlFor  {string}   — links label to input id
 *   value    {string}   — label text (alternative to children)
 *   children {node}     — label content (takes precedence over value)
 *   required {boolean}  — appends a red asterisk
 */

export default function InputLabel({ htmlFor, value, children, required = false }) {
    return (
        <label
            htmlFor={htmlFor}
            className="block text-sm font-medium text-slate-700"
        >
            {children ?? value}
            {required && (
                <span className="ml-0.5 text-red-500" aria-hidden="true"> *</span>
            )}
        </label>
    );
}
