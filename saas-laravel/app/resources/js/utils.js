import moment from 'moment';

export function fmt(n, decimals = 0) {
    if (n == null) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals });
}

export function fmtCurrency(n, currency = 'USD') {
    if (n == null || n === 0) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, maximumFractionDigits: 2,
    }).format(n);
}

export function fmtDate(s) {
    if (!s) return '—';
    const date = moment.parseZone(String(s).trim());
    return date.isValid() ? date.local().format('MMM D, YYYY, HH:mm:ss') : String(s);
}

export function timestampMillis(s) {
    if (!s) return null;
    const date = moment.parseZone(String(s).trim());
    return date.isValid() ? date.valueOf() : null;
}

export function fmtLogMessage(message) {
    if (!message) return message;

    return String(message).replace(
        /\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[zZ]|[+-]\d{2}:?\d{2})?)\]/g,
        (_, timestamp) => fmtDate(timestamp),
    );
}

export function fmtMs(ms) {
    if (ms == null) return '—';
    return `${Number(ms).toLocaleString('en-US')} ms`;
}

export function fmtRate(n) {
    return `${Number(n ?? 0).toFixed(1)}%`;
}
