import { SortEvent } from 'primeng/api';

/**
 * Sort handler for every p-table in the app, used with [customSort]="true".
 *
 * PrimeNG's built-in sort compares raw field values, which is wrong here: the
 * API sends all monetary and quantity fields as *strings* to preserve decimal
 * precision, so "9.5" would rank above "10" and a sorted column would look
 * plainly broken. This compares numerically whenever both values parse as
 * numbers and falls back to locale string comparison otherwise — which keeps
 * ISO dates (YYYY-MM-DD) chronological and symbols alphabetical without any
 * per-column configuration.
 */
export function sortRows(event: SortEvent): void {
    const { data, field } = event;
    const order = event.order ?? 1;
    if (!data || !field) return;
    data.sort((a, b) => {
        const left = value(a, field);
        const right = value(b, field);
        // Blank handling sits outside the order multiplier on purpose, so empty
        // cells sink whichever way the column is sorted: a row with no price is
        // not "the cheapest", and flipping them to the top on descending would
        // bury the rows you asked to see.
        const leftEmpty = isEmpty(left);
        const rightEmpty = isEmpty(right);
        if (leftEmpty || rightEmpty) {
            return leftEmpty && rightEmpty ? 0 : leftEmpty ? 1 : -1;
        }
        return order * compare(left, right);
    });
}

function value(row: unknown, field: string): unknown {
    return (row as Record<string, unknown>)?.[field];
}

function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
}

function compare(a: unknown, b: unknown): number {
    const left = Number(a);
    const right = Number(b);
    if (Number.isFinite(left) && Number.isFinite(right)) {
        return left - right;
    }
    return String(a).localeCompare(String(b));
}
