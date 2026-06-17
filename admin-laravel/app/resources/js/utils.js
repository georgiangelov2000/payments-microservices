/**
 * Shared formatting utilities used across admin page components.
 * Import the specific functions you need — do not import the whole module.
 */
import moment from 'moment';

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
    const date = moment.parseZone(String(dateStr).trim());
    return date.isValid() ? date.local().format('YYYY-MM-DD HH:mm:ss') : String(dateStr);
}

export function timestampMillis(dateStr) {
    if (!dateStr) return null;
    const date = moment.parseZone(String(dateStr).trim());
    return date.isValid() ? date.valueOf() : null;
}

export function fmtLogMessage(message) {
    if (!message) return message;

    return String(message).replace(
        /\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[zZ]|[+-]\d{2}:?\d{2})?)\]/g,
        (_, timestamp) => fmtDate(timestamp),
    );
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
