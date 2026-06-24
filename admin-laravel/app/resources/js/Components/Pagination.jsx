/**
 * Pagination — Laravel pagination controls with result summary.
 *
 * Props:
 *   links  {Array}   — Laravel pagination links array (each: { url, label, active })
 *   meta   {object}  — optional { from, to, total } for result count summary
 */
import { Link } from '@inertiajs/react';

import i18n from '@/i18n';
function IconChevronLeft() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}

function IconChevronRight() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

// Strip HTML entities from Laravel link labels (e.g. &laquo; &raquo;)
function isNavLabel(label) {
    return label.includes('&') || label.includes('Previous') || label.includes('Next');
}

export default function Pagination({ links = [], meta }) {
    // Need at least prev + pages + next to be meaningful
    if (!links || links.length <= 3) return null;

    const prevLink = links[0];
    const nextLink = links[links.length - 1];
    const pageLinks = links.slice(1, -1);

    return (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row">
            {/* Results summary */}
            {meta && meta.total != null ? (
                <p className="text-sm text-slate-500">{i18n.t('generated.components_Pagination.showing')}{' '}
                    <span className="font-medium text-slate-700">{meta.from ?? 1}</span>
                    {' – '}
                    <span className="font-medium text-slate-700">{meta.to ?? meta.total}</span>
                    {' of '}
                    <span className="font-medium text-slate-700">{meta.total}</span>
                    {' results'}
                </p>
            ) : (
                <span />
            )}

            {/* Page controls */}
            <nav className="flex items-center gap-1" aria-label={i18n.t('generated.components_Pagination.pagination')}>
                {/* Previous */}
                {prevLink.url ? (
                    <Link
                        href={prevLink.url}
                        preserveScroll
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                        aria-label={i18n.t('generated.components_Pagination.previousPage')}
                    >
                        <IconChevronLeft />
                    </Link>
                ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed">
                        <IconChevronLeft />
                    </span>
                )}

                {/* Page numbers */}
                {pageLinks.map((link, index) => {
                    // Ellipsis
                    if (link.label === '...') {
                        return (
                            <span key={`ellipsis-${index}`}
                                className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">
                                …
                            </span>
                        );
                    }

                    if (link.active) {
                        return (
                            <span
                                key={link.label}
                                aria-current="page"
                                className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-indigo-600 px-2 text-sm font-semibold text-white"
                            >
                                {link.label}
                            </span>
                        );
                    }

                    if (link.url) {
                        return (
                            <Link
                                key={link.label}
                                href={link.url}
                                preserveScroll
                                className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                {link.label}
                            </Link>
                        );
                    }

                    return (
                        <span
                            key={link.label}
                            className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-300"
                        >
                            {link.label}
                        </span>
                    );
                })}

                {/* Next */}
                {nextLink.url ? (
                    <Link
                        href={nextLink.url}
                        preserveScroll
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                        aria-label={i18n.t('generated.components_Pagination.nextPage')}
                    >
                        <IconChevronRight />
                    </Link>
                ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed">
                        <IconChevronRight />
                    </span>
                )}
            </nav>
        </div>
    );
}
