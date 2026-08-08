import { TransactionRow } from '../models/portfolio.models';
import { toNum } from './format';

/** A ledger row plus the fields the tables derive rather than receive. */
export interface TransactionView extends TransactionRow {
    /** quantity × price, gross of fees; falls back to `amount` for rows that
     *  carry no quantity (dividends, standalone fees). Null when neither. */
    total: string | null;
    /** One numeric field behind the combined "Qty / amount" column, so it can
     *  be sorted at all — the displayed value comes from two different keys. */
    sortQuantity: number | null;
}

export function withDerivedFields(row: TransactionRow): TransactionView {
    return { ...row, total: total(row), sortQuantity: sortQuantity(row) };
}

function total(row: TransactionRow): string | null {
    // Money arrives as strings to preserve precision, so this goes through
    // toNum per the API convention rather than multiplying strings. Float error
    // is confined to a display-only column; the stored values are untouched.
    if (row.quantity != null && row.price != null) {
        return String(toNum(row.quantity) * toNum(row.price));
    }
    return row.amount ?? null;
}

function sortQuantity(row: TransactionRow): number | null {
    const raw = row.quantity ?? row.amount;
    return raw == null ? null : toNum(raw);
}
