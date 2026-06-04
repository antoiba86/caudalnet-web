import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ClosedPosition } from '../../models/portfolio.models';
import { money, percent, pnlClass } from '../../util/format';

@Component({
    selector: 'app-closed-positions-table',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule],
    template: `
        @if (closedPositions().length) {
            <div class="card">
                <div class="font-semibold text-xl mb-4">Closed positions (sold)</div>
                <p-table [value]="closedPositions()" dataKey="symbol">
                    <ng-template #header>
                        <tr>
                            <th>Symbol</th>
                            <th class="text-right">Hold period</th>
                            <th class="text-right">Realized P&amp;L</th>
                            <th class="text-right">ROI</th>
                            <th>Broker</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-c>
                        <tr>
                            <td>
                                <div class="font-medium">{{ c.symbol }}</div>
                                @if (c.name) {
                                    <div class="text-muted-color text-sm">{{ c.name }}</div>
                                }
                            </td>
                            <td class="text-right">{{ holdPeriod(c.hold_period_days) }}</td>
                            <td class="text-right" [ngClass]="cls(c.realized_pnl_base)">{{ fmt(c.realized_pnl_base) }}</td>
                            <td class="text-right" [ngClass]="cls(c.realized_return_pct)">{{ pct(c.realized_return_pct) }}</td>
                            <td>
                                @if (c.broker) {
                                    <p-tag [value]="c.broker" severity="secondary" />
                                }
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        }
    `
})
export class ClosedPositionsTable {
    closedPositions = input<ClosedPosition[]>([]);
    baseCurrency = input<string>('EUR');

    fmt(value: string): string {
        return money(value, this.baseCurrency());
    }
    pct(value: string | null | undefined): string {
        return percent(value);
    }
    cls(value: string | null | undefined): string {
        return pnlClass(value);
    }
    holdPeriod(days: number | null | undefined): string {
        if (days === null || days === undefined) {
            return '—';
        }
        if (days < 31) {
            return `${days}d`;
        }
        if (days < 365) {
            return `${Math.round(days / 30)}mo`;
        }
        return `${(days / 365).toFixed(1)}y`;
    }
}
