import { money, percent, pnlClass, toNum } from './format';

describe('format helpers', () => {
    describe('toNum', () => {
        it('returns 0 for null, undefined or empty', () => {
            expect(toNum(null)).toBe(0);
            expect(toNum(undefined)).toBe(0);
            expect(toNum('')).toBe(0);
        });

        it('parses numeric strings', () => {
            expect(toNum('12.5')).toBe(12.5);
            expect(toNum('-3')).toBe(-3);
        });

        it('returns 0 for non-numeric input', () => {
            expect(toNum('abc')).toBe(0);
        });
    });

    describe('percent', () => {
        it('returns an em dash for nullish values', () => {
            expect(percent(null)).toBe('—');
            expect(percent(undefined)).toBe('—');
            expect(percent('')).toBe('—');
        });

        it('prefixes a + sign and fixes to two decimals for positive values', () => {
            expect(percent('10')).toBe('+10.00');
        });

        it('keeps the - sign for negative values and shows no sign for zero', () => {
            expect(percent('-5.5')).toBe('-5.50');
            expect(percent('0')).toBe('0.00');
        });
    });

    describe('pnlClass', () => {
        it('is green for positive, red for negative, muted for zero/nullish', () => {
            expect(pnlClass('5')).toBe('text-green-500');
            expect(pnlClass('-1')).toBe('text-red-500');
            expect(pnlClass('0')).toBe('text-muted-color');
            expect(pnlClass(null)).toBe('text-muted-color');
        });
    });

    describe('money', () => {
        it('formats a value with the currency (locale-independent digits)', () => {
            // Avoid asserting locale-specific grouping/symbol; just the digits.
            expect(money('1000', 'USD')).toMatch(/1[,.\s ]?000/);
        });

        it('falls back to "<number> <code>" for a malformed currency code', () => {
            expect(money('12.5', 'US')).toBe('12.50 US');
        });

        it('treats nullish as zero', () => {
            expect(money(null, 'US')).toBe('0.00 US');
        });
    });
});
