/**
 * Shared formatting utilities used across admin page components.
 * Import the specific functions you need — do not import the whole module.
 */

/**
 * Format an integer count with locale-aware thousands separators.
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function fmt(n) {
    return Number(n ?? 0).toLocaleString();
}

/**
 * Format a decimal amount as currency (e.g. "$1,234.56").
 * @param {number|null|undefined} value
 * @param {string} currency
 * @returns {string}
 */
export function fmtCurrency(value, currency = 'USD') {
    if (value == null || value === '') return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(value));
}

/**
 * Format an ISO date string into "YYYY-MM-DD HH:mm:ss" (sv-SE locale).
 * Returns "—" for empty/invalid values.
 * @param {string|null|undefined} dateStr
 * @returns {string}
 */
export function fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? String(dateStr) : d.toLocaleString('sv-SE');
}

/**
 * Format a success rate as a percentage string (e.g. "98.7%").
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function fmtRate(n) {
    return `${Number(n ?? 0).toFixed(1)}%`;
}

/**
 * Format a millisecond latency value (e.g. "142 ms"). Returns "—" for null.
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function fmtMs(n) {
    return n != null ? `${fmt(n)} ms` : '—';
}

/**
 * Format a raw count with a thousands separator, returning "0" for nullish.
 * Alias of fmt() kept for call-site readability in subscription tables.
 * @param {number|null|undefined} value
 * @returns {string}
 */
export function fmtCount(value) {
    return fmt(value);
}
