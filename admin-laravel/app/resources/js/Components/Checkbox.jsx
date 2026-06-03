/**
 * Checkbox — styled checkbox with indigo accent.
 *
 * Props:
 *   checked   {boolean}
 *   onChange  {function}
 *   id        {string}
 *   name      {string}
 *   className {string}
 */

export default function Checkbox({ checked, onChange, id, name, className = '', ...rest }) {
    return (
        <input
            id={id}
            name={name}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className={[
                'h-4 w-4 rounded border-slate-300 text-indigo-600',
                'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                'transition-colors cursor-pointer',
                className,
            ].join(' ')}
            {...rest}
        />
    );
}
