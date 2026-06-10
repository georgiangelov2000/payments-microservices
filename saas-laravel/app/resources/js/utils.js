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
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(d);
}

export function fmtMs(ms) {
    if (ms == null) return '—';
    return `${Number(ms).toLocaleString('en-US')} ms`;
}

export function fmtRate(n) {
    return `${Number(n ?? 0).toFixed(1)}%`;
}
