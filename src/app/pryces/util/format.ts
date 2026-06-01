// Display/formatting helpers. The API sends Decimals as strings; parse to number
// only here (for Intl formatting and chart input).

export function toNum(value: string | null | undefined): number {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function money(value: string | null | undefined, currency: string): string {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency
        }).format(toNum(value));
    } catch {
        // Unknown currency code — fall back to a plain number + code.
        return `${toNum(value).toFixed(2)} ${currency}`;
    }
}

export function percent(value: string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    const n = toNum(value);
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
}

// Tailwind text color for a signed value (green up / red down / muted flat).
export function pnlClass(value: string | null | undefined): string {
    const n = toNum(value);
    if (n > 0) return 'text-green-500';
    if (n < 0) return 'text-red-500';
    return 'text-muted-color';
}
