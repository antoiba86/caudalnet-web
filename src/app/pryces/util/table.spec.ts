import { SortEvent } from 'primeng/api';
import { sortRows } from './table';

function sorted(data: Record<string, unknown>[], field: string, order: number): unknown[] {
    const event: SortEvent = { data, field, order };
    sortRows(event);
    return data.map((row) => row[field]);
}

describe('sortRows', () => {
    it('sorts string-typed numbers numerically, not lexically', () => {
        // The bug this exists to prevent: money and quantity arrive as strings
        // to preserve precision, so a lexical sort puts "9.5" above "10".
        const rows = [{ price: '9.5' }, { price: '10' }, { price: '100' }, { price: '2' }];

        expect(sorted(rows, 'price', 1)).toEqual(['2', '9.5', '10', '100']);
    });

    it('reverses on descending order', () => {
        const rows = [{ price: '2' }, { price: '100' }, { price: '9.5' }];

        expect(sorted(rows, 'price', -1)).toEqual(['100', '9.5', '2']);
    });

    it('keeps ISO dates chronological', () => {
        const rows = [{ date: '2026-08-04' }, { date: '2026-03-10' }, { date: '2026-06-01' }];

        expect(sorted(rows, 'date', 1)).toEqual(['2026-03-10', '2026-06-01', '2026-08-04']);
    });

    it('sorts newest first when descending', () => {
        const rows = [{ date: '2026-03-10' }, { date: '2026-08-04' }, { date: '2026-06-01' }];

        expect(sorted(rows, 'date', -1)).toEqual(['2026-08-04', '2026-06-01', '2026-03-10']);
    });

    it('sorts non-numeric values as text', () => {
        const rows = [{ symbol: 'VUSA.AS' }, { symbol: 'ASTS' }, { symbol: '0P0001DFE8.F' }];

        expect(sorted(rows, 'symbol', 1)).toEqual(['0P0001DFE8.F', 'ASTS', 'VUSA.AS']);
    });

    describe('blank cells', () => {
        // A row with no price is not "the cheapest" — blanks sink either way,
        // so flipping direction never buries the rows you asked to see.
        it('sinks blanks when ascending', () => {
            const rows = [{ price: null }, { price: '10' }, { price: '2' }];

            expect(sorted(rows, 'price', 1)).toEqual(['2', '10', null]);
        });

        it('sinks blanks when descending too', () => {
            const rows = [{ price: null }, { price: '2' }, { price: '10' }];

            expect(sorted(rows, 'price', -1)).toEqual(['10', '2', null]);
        });

        it('treats undefined and empty string as blank', () => {
            const rows = [{ price: undefined }, { price: '' }, { price: '5' }];

            expect(sorted(rows, 'price', 1)[0]).toBe('5');
        });
    });

    it('does nothing without data or a field', () => {
        expect(() => sortRows({ data: undefined, field: 'price', order: 1 })).not.toThrow();
        expect(() => sortRows({ data: [{ a: 1 }], field: undefined, order: 1 })).not.toThrow();
    });

    it('defaults to ascending when no order is given', () => {
        const data = [{ price: '10' }, { price: '2' }];
        sortRows({ data, field: 'price' });

        expect(data.map((r) => r.price)).toEqual(['2', '10']);
    });
});
