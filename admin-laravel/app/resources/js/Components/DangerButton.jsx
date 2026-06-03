/**
 * DangerButton — red destructive action button.
 *
 * Props:
 *   disabled    {boolean}
 *   processing  {boolean}   — shows spinner
 *   children    {node}
 *   className   {string}
 *   onClick     {function}
 *   type        {string}    — default 'button'
 */

function Spinner() {
    return (
        <svg className="h-4 w-4 animate-spin shrink-0" xmlns="http://www.w3.org/2000/svg"
            fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function DangerButton({
    disabled = false,
    processing = false,
    children,
    className = '',
    onClick,
    type = 'button',
}) {
    const isDisabled = disabled || processing;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={[
                'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
                'bg-red-600 hover:bg-red-700',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                'transition-colors',
                isDisabled ? 'opacity-60 cursor-not-allowed' : '',
                className,
            ].join(' ')}
        >
            {processing && <Spinner />}
            {children}
        </button>
    );
}
