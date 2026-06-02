import { CommonModule } from '@angular/common';
import { Component, input, model } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TransactionRow } from '../../models/portfolio.models';
import { money, percent, pnlClass } from '../../util/format';

@Component({
    selector: 'app-transaction-history',
    standalone: true,
    imports: [CommonModule, DialogModule, TableModule, TagModule],
    template: `
        <p-dialog [(visible)]="visible" [modal]="true" [style]="{ width: '640px' }"
            [header]="symbol() + (name() ? ' — ' + name() : '')">
            <div class="flex flex-wrap gap-6 mb-4">
                <div>
                    <span class="block text-muted-color text-sm">Lifetime P&amp;L</span>
                    <span class="font-medium text-lg" [ngClass]="cls(lifetimePnl())">{{ money(lifetimePnl(), baseCurrency()) }}</span>
                </div>
                <div>
                    <span class="block text-muted-color text-sm">Lifetime return (XIRR)</span>
                    <span class="font-medium text-lg" [ngClass]="cls(lifetimeReturn())">{{ pct(lifetimeReturn()) }}</span>
                </div>
            </div>

            <p-table [value]="rows()" dataKey="date" [scrollable]="true">
                <ng-template #header>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th class="text-right">Qty / amount</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Fee</th>
                        @if (showPortfolio()) { <th>Portfolio</th> }
                        <th>Broker</th>
                    </tr>
                </ng-template>
                <ng-template #body let-t>
                    <tr>
                        <td>{{ t.date }}</td>
                        <td><p-tag [value]="t.type" [severity]="severity(t.type)" /></td>
                        <td class="text-right">{{ t.quantity ?? t.amount ?? '—' }}</td>
                        <td class="text-right">{{ t.price ? money(t.price, t.currency) : '—' }}</td>
                        <td class="text-right">{{ money(t.fee, t.currency) }}</td>
                        @if (showPortfolio()) { <td>{{ t.portfolio }}</td> }
                        <td>@if (t.broker) { <p-tag [value]="t.broker" severity="secondary" /> }</td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr><td colspan="7" class="text-center text-muted-color p-6">No transactions.</td></tr>
                </ng-template>
            </p-table>
        </p-dialog>
    `
})
export class TransactionHistory {
    visible = model<boolean>(false);
    symbol = input<string>('');
    name = input<string | null | undefined>(null);
    rows = input<TransactionRow[]>([]);
    lifetimePnl = input<string>('0');
    lifetimeReturn = input<string | null | undefined>(null);
    baseCurrency = input<string>('EUR');
    showPortfolio = input<boolean>(false);

    money(value: string | null | undefined, currency: string): string {
        return money(value, currency);
    }
    pct(value: string | null | undefined): string {
        return percent(value);
    }
    cls(value: string | null | undefined): string {
        return pnlClass(value);
    }
    severity(type: string): 'info' | 'warn' | 'success' {
        if (type === 'buy') return 'info';
        if (type === 'sell') return 'warn';
        return 'success';
    }
}
