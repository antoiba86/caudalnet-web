import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TransactionRow } from '../../models/portfolio.models';
import { TransactionHistory } from './transaction-history';

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

describe('TransactionHistory', () => {
    let fixture: ComponentFixture<TransactionHistory>;
    let component: TransactionHistory;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TransactionHistory],
            providers: [provideNoopAnimations()]
        }).compileComponents();
        fixture = TestBed.createComponent(TransactionHistory);
        component = fixture.componentInstance;
    });

    it('creates', () => {
        expect(component).toBeTruthy();
    });

    it('columnCount grows with the optional portfolio and actions columns', () => {
        expect(component.columnCount()).toBe(6);

        fixture.componentRef.setInput('showPortfolio', true);
        expect(component.columnCount()).toBe(7);

        fixture.componentRef.setInput('editable', true);
        expect(component.columnCount()).toBe(8);
    });

    it('maps a transaction type to a tag severity', () => {
        expect(component.severity('buy')).toBe('info');
        expect(component.severity('sell')).toBe('warn');
        expect(component.severity('dividend')).toBe('success');
    });

    it('emits the row on edit and remove', () => {
        const row = makeRow();
        let edited: TransactionRow | undefined;
        let removed: TransactionRow | undefined;
        component.edit.subscribe((r) => (edited = r));
        component.remove.subscribe((r) => (removed = r));

        component.edit.emit(row);
        component.remove.emit(row);

        expect(edited).toBe(row);
        expect(removed).toBe(row);
    });
});
