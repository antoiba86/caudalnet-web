import { CommonModule } from '@angular/common';
import { Component, computed, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TransactionRow } from '../../models/portfolio.models';
import { money } from '../../util/format';

/**
 * The portfolio's complete ledger, every row editable and deletable.
 *
 * This exists because the positions view is not a complete picture: the API
 * drops any holding it cannot price, so a transaction whose symbol never
 * resolved to a ticker — the usual outcome of a failed import — is invisible
 * there and unreachable by the per-position history dialog. Those are exactly
 * the rows a user needs to remove, so this view flags them explicitly.
 */
@Component({
    selector: 'app-all-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, MessageModule, ProgressSpinnerModule, TableModule, TagModule],
    template: `
        <p-dialog [(visible)]="visible" [modal]="true" [dismissableMask]="true" [style]="{ width: '860px' }" [breakpoints]="{ '768px': '95vw' }" [contentStyle]="{ 'max-height': '70vh' }" header="All transactions">
            @if (unpricedCount() > 0) {
                <p-message severity="warn" styleClass="mb-4 w-full">
                    <span class="text-sm">
                        {{ unpricedCount() }} row(s) have a symbol that does not resolve to a tradable ticker, so they are excluded from positions and totals. They usually come from an import where the instrument could not be matched — fix the symbol
                        or delete the row.
                    </span>
                </p-message>
            }

            <div class="flex items-center gap-3 mb-4">
                <input pInputText placeholder="Filter by symbol, broker or date" [(ngModel)]="filter" (ngModelChange)="filterText.set($event)" class="w-full" />
                <p-button icon="pi pi-refresh" [text]="true" [rounded]="true" severity="secondary" [disabled]="loading()" (onClick)="refresh.emit()" />
            </div>

            @if (loading()) {
                <div class="flex justify-center p-8"><p-progressspinner /></div>
            } @else {
                <p-table [value]="filtered()" dataKey="id" [scrollable]="true" [tableStyle]="{ 'min-width': '52rem' }">
                    <ng-template #header>
                        <tr>
                            <th>Date</th>
                            <th>Symbol</th>
                            <th>Type</th>
                            <th class="text-right">Qty / amount</th>
                            <th class="text-right">Price</th>
                            <th class="text-right">Fee</th>
                            <th>Broker</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-t>
                        <tr>
                            <td class="whitespace-nowrap">{{ t.date }}</td>
                            <td>
                                <div class="flex items-center gap-2">
                                    <span [class.text-muted-color]="isUnpriced(t)">{{ t.symbol }}</span>
                                    @if (isUnpriced(t)) {
                                        <p-tag value="unpriced" severity="warn" />
                                    }
                                </div>
                            </td>
                            <td><p-tag [value]="t.type" [severity]="severity(t.type)" /></td>
                            <td class="text-right">{{ t.quantity ?? t.amount ?? '—' }}</td>
                            <td class="text-right">{{ t.price ? money(t.price, t.currency) : '—' }}</td>
                            <td class="text-right">{{ money(t.fee, t.currency) }}</td>
                            <td>
                                @if (t.broker) {
                                    <p-tag [value]="t.broker" severity="secondary" />
                                }
                            </td>
                            <td class="text-right whitespace-nowrap">
                                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" (onClick)="edit.emit(t)" />
                                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="remove.emit(t)" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="8" class="text-center text-muted-color p-6">
                                {{ rows().length ? 'No transactions match the filter.' : 'No transactions.' }}
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            }
        </p-dialog>
    `
})
export class AllTransactions {
    visible = model<boolean>(false);
    rows = input<TransactionRow[]>([]);
    loading = input<boolean>(false);
    /** Symbols the API was able to price — anything else is flagged unpriced. */
    pricedSymbols = input<string[]>([]);
    edit = output<TransactionRow>();
    remove = output<TransactionRow>();
    refresh = output<void>();

    filter = '';
    filterText = signal('');

    private priced = computed(() => new Set(this.pricedSymbols().map((s) => s.toUpperCase())));

    filtered = computed(() => {
        const needle = this.filterText().trim().toLowerCase();
        if (!needle) return this.rows();
        return this.rows().filter((t) => `${t.symbol} ${t.broker ?? ''} ${t.date}`.toLowerCase().includes(needle));
    });

    unpricedCount = computed(() => this.rows().filter((t) => this.isUnpriced(t)).length);

    isUnpriced(row: TransactionRow): boolean {
        // An empty priced set means the portfolio has no positions at all (or
        // has not loaded); flagging every row then would be noise, not signal.
        const priced = this.priced();
        return priced.size > 0 && !priced.has(row.symbol.toUpperCase());
    }

    money(value: string | null | undefined, currency: string): string {
        return money(value, currency);
    }

    severity(type: string): 'info' | 'warn' | 'success' {
        if (type === 'buy') return 'info';
        if (type === 'sell') return 'warn';
        return 'success';
    }
}
