/**
 * Modal — accessible dialog component using React state.
 *
 * Props:
 *   show        {boolean}                     — controls visibility
 *   title       {string}                      — dialog heading
 *   description {string}                      — optional subtitle
 *   size        {'sm'|'md'|'lg'|'xl'}         — panel max-width (default 'md')
 *   onClose     {function}                    — called on backdrop click or Escape
 *   children    {node}                        — dialog body content
 *   footer      {node}                        — optional footer slot
 */
import { useEffect, useRef } from 'react';

import i18n from '@/i18n';
const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

function IconX() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-5 w-5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default function Modal({
    show = false,
    title,
    description,
    size = 'md',
    onClose,
    children,
    footer,
}) {
    const panelRef = useRef(null);

    // Escape key handler
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onClose]);

    // Focus trap: move focus into panel when opened
    useEffect(() => {
        if (show && panelRef.current) {
            const firstFocusable = panelRef.current.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            firstFocusable?.focus();
        }
    }, [show]);

    // Prevent body scroll while open
    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [show]);

    if (!show) return null;

    const panelSize = sizeClasses[size] ?? sizeClasses.md;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={[
                    'relative z-10 w-full rounded-xl bg-white shadow-xl',
                    panelSize,
                    'animate-in fade-in zoom-in-95 duration-150',
                ].join(' ')}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                        <div className="min-w-0">
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="text-base font-semibold text-slate-900"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="mt-0.5 text-sm text-slate-500">{description}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                            <span className="sr-only">{i18n.t('common.actions.close')}</span>
                            <IconX />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-5">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
