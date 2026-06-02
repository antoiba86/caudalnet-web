import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Position } from '../../models/portfolio.models';
import { money, percent, pnlClass } from '../../util/format';

@Component({
    selector: 'app-positions-table',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule],
    template: `
        <div class="card">
            <div class="font-semibold text-xl mb-4">{{ title() }}</div>
            <p-table [value]="positions()" dataKey="symbol" [scrollable]="true">
                <ng-template #header>
                    <tr>
                        <th>Symbol</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Avg cost</th>
                        <th class="text-right">Price</th>
                        <th class="text-right">Value</th>
                        <th class="text-right">Unrealized</th>
                        <th class="text-right">Realized</th>
                        <th class="text-right">Return</th>
                        <th class="text-right">Lifetime</th>
                        <th>Broker</th>
                    </tr>
                </ng-template>
                <ng-template #body let-pos>
                    <tr class="cursor-pointer" (click)="historyClick.emit(pos)">
                        <td>
                            <div class="font-medium">{{ pos.symbol }} <i class="pi pi-history text-muted-color text-xs ml-1"></i></div>
                            @if (pos.name) { <div class="text-muted-color text-sm">{{ pos.name }}</div> }
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
                        <td>@if (pos.broker) { <p-tag [value]="pos.broker" severity="secondary" /> }</td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr><td colspan="10" class="text-center text-muted-color p-6">No open positions.</td></tr>
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
