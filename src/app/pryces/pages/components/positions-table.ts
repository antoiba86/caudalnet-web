import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { SortEvent } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Position } from '../../models/portfolio.models';
import { money, percent, pnlClass } from '../../util/format';
import { sortRows } from '../../util/table';

@Component({
    selector: 'app-positions-table',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule],
    template: `
        <div class="card">
            <div class="font-semibold text-xl mb-4">{{ title() }}</div>
            <!-- Ten columns need far more than a phone's width; min-width lets the
                 table scroll sideways rather than crushing every column. -->
            <p-table [value]="positions()" dataKey="symbol" [scrollable]="true" [tableStyle]="{ 'min-width': '60rem' }" [customSort]="true" sortField="value_base" [sortOrder]="-1" (sortFunction)="sort($event)">
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="symbol">Symbol <p-sortIcon field="symbol" /></th>
                        <th class="text-right" pSortableColumn="quantity">Qty <p-sortIcon field="quantity" /></th>
                        <th class="text-right" pSortableColumn="avg_cost">Avg cost <p-sortIcon field="avg_cost" /></th>
                        <th class="text-right" pSortableColumn="price">Price <p-sortIcon field="price" /></th>
                        <th class="text-right" pSortableColumn="value_base">Value <p-sortIcon field="value_base" /></th>
                        <th class="text-right" pSortableColumn="unrealized_pnl_base">Unrealized <p-sortIcon field="unrealized_pnl_base" /></th>
                        <th class="text-right" pSortableColumn="realized_pnl_base">Realized <p-sortIcon field="realized_pnl_base" /></th>
                        <th class="text-right" pSortableColumn="total_return_pct">Return <p-sortIcon field="total_return_pct" /></th>
                        <th class="text-right" pSortableColumn="lifetime_pnl_base">Lifetime <p-sortIcon field="lifetime_pnl_base" /></th>
                        <th pSortableColumn="broker">Broker <p-sortIcon field="broker" /></th>
                    </tr>
                </ng-template>
                <ng-template #body let-pos>
                    <tr class="cursor-pointer" (click)="historyClick.emit(pos)">
                        <td>
                            <div class="font-medium">{{ pos.symbol }} <i class="pi pi-history text-muted-color text-xs ml-1"></i></div>
                            @if (pos.name) {
                                <div class="text-muted-color text-sm">{{ pos.name }}</div>
                            }
                        </td>
                        <td class="text-right">{{ pos.quantity }}</td>
                        <td class="text-right">{{ fmtCcy(pos.avg_cost, pos.currency) }}</td>
                        <td class="text-right">{{ fmtCcy(pos.price, pos.currency) }}</td>
                        <td class="text-right">{{ fmt(pos.value_base) }}</td>
                        <td class="text-right" [ngClass]="cls(pos.unrealized_pnl_base)">{{ fmt(pos.unrealized_pnl_base) }}</td>
                        <td class="text-right" [ngClass]="cls(pos.realized_pnl_base)">{{ fmt(pos.realized_pnl_base) }}</td>
                        <td class="text-right" [ngClass]="cls(pos.total_return_pct)">{{ pct(pos.total_return_pct) }}</td>
                        <td class="text-right">
                            <div [ngClass]="cls(pos.lifetime_pnl_base)">{{ fmt(pos.lifetime_pnl_base) }}</div>
                            @if (pos.lifetime_return_pct) {
                                <div class="text-muted-color text-sm" [ngClass]="cls(pos.lifetime_return_pct)">{{ pct(pos.lifetime_return_pct) }}</div>
                            }
                        </td>
                        <td>
                            @if (pos.broker) {
                                <p-tag [value]="pos.broker" severity="secondary" />
                            }
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="10" class="text-center text-muted-color p-6">No open positions.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class PositionsTable {
    positions = input<Position[]>([]);
    baseCurrency = input<string>('EUR');
    title = input<string>('Positions');
    historyClick = output<Position>();

    sort(event: SortEvent): void {
        sortRows(event);
    }

    fmt(value: string): string {
        return money(value, this.baseCurrency());
    }
    fmtCcy(value: string, currency: string): string {
        return money(value, currency);
    }
    pct(value: string | null | undefined): string {
        return percent(value);
    }
    cls(value: string | null | undefined): string {
        return pnlClass(value);
    }
}
