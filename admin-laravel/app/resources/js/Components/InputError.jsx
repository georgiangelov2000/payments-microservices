/**
 * InputError — inline form validation error message.
 *
 * Props:
 *   message   {string}  — error text to display
 *   className {string}  — extra classes
 */

function IconWarning() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
                clipRule="evenodd" />
        </svg>
    );
}

export default function InputError({ message, className = '' }) {
    if (!message) return null;

    return (
        <p className={['flex items-center gap-1.5 text-xs text-red-600 mt-1', className].join(' ')}>
            <IconWarning />
            {message}
        </p>
    );
}
