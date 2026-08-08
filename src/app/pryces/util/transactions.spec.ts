import { TransactionRow } from '../models/portfolio.models';
import { withDerivedFields } from './transactions';

function row(overrides: Partial<TransactionRow> = {}): TransactionRow {
    return {
        id: 't1',
        date: '2026-06-01',
        type: 'buy',
        symbol: 'AAPL',
        quantity: '2',
        price: '100',
        fee: '1',
        currency: 'USD',
        ...overrides
    };
}

describe('withDerivedFields', () => {
    describe('total', () => {
        it('is quantity × price', () => {
            expect(withDerivedFields(row({ quantity: '3', price: '50' })).total).toBe('150');
        });

        it('is gross — the fee is not added in', () => {
            // Fee has its own column; folding it in would make Total and
            // Price × Qty disagree on the same row.
            expect(withDerivedFields(row({ quantity: '2', price: '100', fee: '25' })).total).toBe('200');
        });

        it('handles fractional quantities', () => {
            expect(withDerivedFields(row({ quantity: '0.5', price: '218.4' })).total).toBe('109.2');
        });

        it('falls back to amount when there is no quantity', () => {
            // Dividends and standalone fees carry an amount and nothing else.
            const derived = withDerivedFields(row({ quantity: null, price: null, amount: '42.50' }));

            expect(derived.total).toBe('42.50');
        });

        it('is null when neither quantity+price nor amount is present', () => {
            expect(withDerivedFields(row({ quantity: null, price: null })).total).toBeNull();
        });
    });

    describe('sortQuantity', () => {
        // The displayed column shows quantity ?? amount, two different keys, so
        // sorting needs one numeric field behind it.
        it('uses quantity when present', () => {
            expect(withDerivedFields(row({ quantity: '7' })).sortQuantity).toBe(7);
        });

        it('falls back to amount', () => {
            const derived = withDerivedFields(row({ quantity: null, amount: '42.5' }));

            expect(derived.sortQuantity).toBe(42.5);
        });

        it('is null when there is neither', () => {
            expect(withDerivedFields(row({ quantity: null, amount: null })).sortQuantity).toBeNull();
        });
    });

    it('preserves every original field', () => {
        const original = row({ broker: 'DEGIRO', portfolio: 'Main' });

        expect(withDerivedFields(original)).toEqual(jasmine.objectContaining(original));
    });
});
