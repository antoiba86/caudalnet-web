import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output } from '@angular/core';
import { SortEvent } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TransactionRow } from '../../models/portfolio.models';
import { money, percent, pnlClass } from '../../util/format';
import { sortRows } from '../../util/table';
import { withDerivedFields } from '../../util/transactions';

@Component({
    selector: 'app-transaction-history',
    standalone: true,
    imports: [CommonModule, ButtonModule, DialogModule, TableModule, TagModule],
    template: `
        <!-- A fixed width overflows a phone viewport and carries the header's close
             button off-screen with it, so the dialog becomes impossible to dismiss.
             The breakpoint keeps it inside the screen; dismissableMask gives a second
             way out on touch. -->
        <p-dialog [(visible)]="visible" [modal]="true" [dismissableMask]="true" [style]="{ width: '720px' }" [breakpoints]="{ '768px': '95vw' }" [contentStyle]="{ 'max-height': '70vh' }" [header]="symbol() + (name() ? ' — ' + name() : '')">
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

            <!-- min-width keeps the columns legible and lets the row scroll sideways
                 instead of being crushed on a narrow screen. -->
            <p-table [value]="sortedRows()" dataKey="id" [scrollable]="true" [tableStyle]="{ 'min-width': '50rem' }" [customSort]="true" sortField="date" [sortOrder]="-1" (sortFunction)="sort($event)">
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="date">Date <p-sortIcon field="date" /></th>
                        <th pSortableColumn="type">Type <p-sortIcon field="type" /></th>
                        <th class="text-right" pSortableColumn="sortQuantity">Qty / amount <p-sortIcon field="sortQuantity" /></th>
                        <th class="text-right" pSortableColumn="price">Price <p-sortIcon field="price" /></th>
                        <th class="text-right" pSortableColumn="total">Total <p-sortIcon field="total" /></th>
                        <th class="text-right" pSortableColumn="fee">Fee <p-sortIcon field="fee" /></th>
                        @if (showPortfolio()) {
                            <th pSortableColumn="portfolio">Portfolio <p-sortIcon field="portfolio" /></th>
                        }
                        <th pSortableColumn="broker">Broker <p-sortIcon field="broker" /></th>
                        @if (editable()) {
                            <th class="text-right">Actions</th>
                        }
                    </tr>
                </ng-template>
                <ng-template #body let-t>
                    <tr>
                        <td>{{ t.date }}</td>
                        <td><p-tag [value]="t.type" [severity]="severity(t.type)" /></td>
                        <td class="text-right">{{ t.quantity ?? t.amount ?? '—' }}</td>
                        <td class="text-right">{{ t.price ? money(t.price, t.currency) : '—' }}</td>
                        <td class="text-right">{{ t.total !== null ? money(t.total, t.currency) : '—' }}</td>
                        <td class="text-right">{{ money(t.fee, t.currency) }}</td>
                        @if (showPortfolio()) {
                            <td>{{ t.portfolio }}</td>
                        }
                        <td>
                            @if (t.broker) {
                                <p-tag [value]="t.broker" severity="secondary" />
                            }
                        </td>
                        @if (editable()) {
                            <td class="text-right whitespace-nowrap">
                                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" (onClick)="edit.emit(t)" />
                                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="remove.emit(t)" />
                            </td>
                        }
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td [attr.colspan]="columnCount()" class="text-center text-muted-color p-6">No transactions.</td>
                    </tr>
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
    editable = input<boolean>(false);
    edit = output<TransactionRow>();
    remove = output<TransactionRow>();

    // Sorting works on a derived copy: `total` is computed, not sent by the API,
    // and the quantity/amount column needs one numeric field to sort on.
    sortedRows = computed(() => this.rows().map(withDerivedFields));

    columnCount = computed(() => 7 + (this.showPortfolio() ? 1 : 0) + (this.editable() ? 1 : 0));

    sort(event: SortEvent): void {
        sortRows(event);
    }

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
