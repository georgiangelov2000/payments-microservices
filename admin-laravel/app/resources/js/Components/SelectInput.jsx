/**
 * SelectInput — styled select element.
 *
 * Props:
 *   id        {string}
 *   name      {string}
 *   value     {string}
 *   onChange  {function}
 *   className {string}
 *   error     {string}   — error message; triggers red border
 *   children  {node}     — <option> elements
 */

export default function SelectInput({
    id,
    name,
    value,
    onChange,
    className = '',
    error,
    children,
    ...rest
}) {
    return (
        <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className={[
                'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm',
                'focus:outline-none focus:ring-1 transition-colors appearance-none bg-no-repeat',
                'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E")]',
                'bg-[right_0.5rem_center] bg-[length:1.25rem_1.25rem] pr-9',
                error
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white',
                className,
            ].join(' ')}
            {...rest}
        >
            {children}
        </select>
    );
}
