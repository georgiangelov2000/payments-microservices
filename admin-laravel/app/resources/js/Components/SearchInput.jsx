
import i18n from '@/i18n';/**
 * SearchInput — text input with magnifying-glass icon and clear button.
 *
 * Props:
 *   value       {string}
 *   onChange    {function}  — called with the input change event
 *   onClear     {function}  — optional; called when X is clicked (falls back to onChange with empty value)
 *   placeholder {string}    — default 'Search…'
 *   className   {string}    — extra wrapper classes
 */

function IconSearch() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4 text-slate-400 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function IconX() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className="h-3.5 w-3.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default function SearchInput({
    value = '',
    onChange,
    onClear,
    placeholder = 'Search…',
    className = '',
}) {
    const handleClear = () => {
        if (onClear) {
            onClear();
        } else {
            // Synthesise a change event with empty value
            onChange?.({ target: { value: '' } });
        }
    };

    return (
        <div className={['relative flex items-center', className].join(' ')}>
            <span className="pointer-events-none absolute left-3 flex items-center">
                <IconSearch />
            </span>

            <input
                type="search"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={[
                    'w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900',
                    'placeholder:text-slate-400 shadow-sm',
                    'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
                    'transition-colors',
                    '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
                ].join(' ')}
            />

            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 flex items-center rounded p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={i18n.t('generated.components_SearchInput.clearSearch')}
                >
                    <IconX />
                </button>
            )}
        </div>
    );
}
