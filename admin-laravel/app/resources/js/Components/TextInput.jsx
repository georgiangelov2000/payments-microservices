/**
 * TextInput — styled text input with error state support.
 *
 * Props:
 *   id           {string}
 *   name         {string}
 *   type         {string}    — default 'text'
 *   value        {string}
 *   className    {string}    — extra classes
 *   autoComplete {string}
 *   required     {boolean}
 *   isFocused    {boolean}   — auto-focus on mount
 *   onChange     {function}
 *   placeholder  {string}
 *   error        {string}    — error message; triggers red border
 *
 * Uses forwardRef for parent ref access.
 */
import { forwardRef, useEffect, useRef } from 'react';

const TextInput = forwardRef(function TextInput(
    {
        id,
        name,
        type = 'text',
        value,
        className = '',
        autoComplete,
        required = false,
        isFocused = false,
        onChange,
        placeholder,
        error,
        ...rest
    },
    ref
) {
    const inputRef = ref ?? useRef(null);

    useEffect(() => {
        if (isFocused && inputRef?.current) {
            inputRef.current.focus();
        }
    }, [isFocused]);

    return (
        <input
            id={id}
            name={name}
            type={type}
            value={value}
            ref={inputRef}
            autoComplete={autoComplete}
            required={required}
            onChange={onChange}
            placeholder={placeholder}
            className={[
                'w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400',
                'focus:outline-none focus:ring-1 transition-colors',
                error
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white',
                className,
            ].join(' ')}
            {...rest}
        />
    );
});

export default TextInput;
