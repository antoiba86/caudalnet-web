import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TransactionRow } from '../../models/portfolio.models';
import { AllTransactions } from './all-transactions';

function makeRow(overrides: Partial<TransactionRow> = {}): TransactionRow {
    return {
        id: 't1',
        date: '2024-01-10',
        type: 'buy',
        symbol: 'AAPL',
        quantity: '5',
        price: '100',
        fee: '1',
        currency: 'USD',
        ...overrides
    };
}

describe('AllTransactions', () => {
    let fixture: ComponentFixture<AllTransactions>;
    let component: AllTransactions;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AllTransactions],
            providers: [provideNoopAnimations()]
        }).compileComponents();
        fixture = TestBed.createComponent(AllTransactions);
        component = fixture.componentInstance;
    });

    it('creates', () => {
        expect(component).toBeTruthy();
    });

    describe('unpriced detection', () => {
        // The whole point of this view: a row whose symbol never resolved is
        // dropped from positions, so it must be findable and flagged here.
        it('flags a row whose symbol is not among the priced ones', () => {
            fixture.componentRef.setInput('rows', [makeRow(), makeRow({ id: 't2', symbol: 'R4 MULTIGESTION NUMANTIA' })]);
            fixture.componentRef.setInput('pricedSymbols', ['AAPL']);

            expect(component.unpricedCount()).toBe(1);
            expect(component.isUnpriced(makeRow({ symbol: 'R4 MULTIGESTION NUMANTIA' }))).toBe(true);
            expect(component.isUnpriced(makeRow())).toBe(false);
        });

        it('matches symbols case-insensitively', () => {
            fixture.componentRef.setInput('pricedSymbols', ['vusa.as']);

            expect(component.isUnpriced(makeRow({ symbol: 'VUSA.AS' }))).toBe(false);
        });

        it('flags nothing when no symbols are priced yet', () => {
            // An unloaded or position-less portfolio would otherwise mark every
            // row as broken, which is noise rather than signal.
            fixture.componentRef.setInput('rows', [makeRow()]);
            fixture.componentRef.setInput('pricedSymbols', []);

            expect(component.unpricedCount()).toBe(0);
        });

        it('treats a closed position as priced', () => {
            fixture.componentRef.setInput('rows', [makeRow({ symbol: 'SOFI' })]);
            fixture.componentRef.setInput('pricedSymbols', ['AAPL', 'SOFI']);

            expect(component.unpricedCount()).toBe(0);
        });
    });

    describe('filtering', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('rows', [makeRow({ id: 't1', symbol: 'AAPL', broker: 'DEGIRO' }), makeRow({ id: 't2', symbol: 'VUSA.AS', broker: 'Trade Republic', date: '2025-06-02' })]);
        });

        it('returns every row when the filter is blank', () => {
            expect(component.filtered().length).toBe(2);
        });

        it('matches on symbol, broker and date', () => {
            component.filterText.set('vusa');
            expect(component.filtered().map((r) => r.id)).toEqual(['t2']);

            component.filterText.set('degiro');
            expect(component.filtered().map((r) => r.id)).toEqual(['t1']);

            component.filterText.set('2025-06');
            expect(component.filtered().map((r) => r.id)).toEqual(['t2']);
        });

        it('ignores surrounding whitespace and case', () => {
            component.filterText.set('  AaPl  ');
            expect(component.filtered().map((r) => r.id)).toEqual(['t1']);
        });
    });
});
