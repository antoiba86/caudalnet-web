import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Overview, Position, TransactionRow } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { money, percent, pnlClass } from '../../util/format';
import { AllocationChart } from '../components/allocation-chart';
import { ClosedPositionsTable } from '../components/closed-positions-table';
import { PositionsTable } from '../components/positions-table';
import { StatCard, StatCards } from '../components/stat-cards';
import { TransactionHistory } from '../components/transaction-history';

@Component({
    selector: 'app-overview',
    standalone: true,
    imports: [CommonModule, RouterModule, TableModule, ToastModule, ProgressSpinnerModule, StatCards, AllocationChart, PositionsTable, ClosedPositionsTable, TransactionHistory],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="mb-6 text-2xl font-semibold">Net worth — all portfolios</div>

        @if (loading()) {
            <div class="flex justify-center p-8"><p-progressspinner /></div>
        } @else if (overview(); as ov) {
            <app-stat-cards [stats]="stats()" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-4">
                    <app-allocation-chart [positions]="ov.portfolio.positions" />

                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Portfolios</div>
                        <p-table [value]="ov.breakdown" dataKey="name">
                            <ng-template #header>
                                <tr>
                                    <th>Portfolio</th>
                                    <th class="text-right">Value</th>
                                    <th class="text-right">Profit</th>
                                    <th class="text-right">Return</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-b>
                                <tr class="cursor-pointer" [routerLink]="['/portfolios', b.name]">
                                    <td class="font-medium">{{ b.name }}</td>
                                    <td class="text-right">{{ fmt(b.total_value) }}</td>
                                    <td class="text-right" [ngClass]="cls(b.total_profit)">{{ fmt(b.total_profit) }}</td>
                                    <td class="text-right" [ngClass]="cls(b.total_return_pct)">{{ pct(b.total_return_pct) }}</td>
                                </tr>
                            </ng-template>
                            <ng-template #emptymessage>
                                <tr>
                                    <td colspan="4" class="text-center text-muted-color p-6">No portfolios yet.</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-8">
                    <app-positions-table title="Holdings (all portfolios)" [positions]="ov.portfolio.positions" [baseCurrency]="ov.portfolio.base_currency" (historyClick)="openHistory($event)" />
                    <app-closed-positions-table [closedPositions]="ov.portfolio.closed_positions" [baseCurrency]="ov.portfolio.base_currency" />
                </div>
            </div>
        }

        <app-transaction-history
            [(visible)]="historyVisible"
            [symbol]="historySymbol()"
            [name]="historyName()"
            [rows]="historyRows()"
            [lifetimePnl]="historyLifetimePnl()"
            [lifetimeReturn]="historyLifetimeReturn()"
            [baseCurrency]="overview()?.portfolio?.base_currency ?? 'EUR'"
            [showPortfolio]="true"
        />
    `
})
export class OverviewPage implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly messages = inject(MessageService);

    overview = signal<Overview | null>(null);
    loading = signal(false);

    historyVisible = signal(false);
    historySymbol = signal('');
    historyName = signal<string | null>(null);
    historyRows = signal<TransactionRow[]>([]);
    historyLifetimePnl = signal('0');
    historyLifetimeReturn = signal<string | null>(null);

    private get baseCurrency(): string {
        return this.overview()?.portfolio.base_currency ?? 'EUR';
    }

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.api.overview().subscribe({
            next: (ov) => {
                this.overview.set(ov);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.messages.add({
                    severity: 'error',
                    summary: 'Load failed',
                    detail: 'Could not reach the API. Is pryces-api running?'
                });
            }
        });
    }

    openHistory(pos: Position): void {
        this.historySymbol.set(pos.symbol);
        this.historyName.set(pos.name ?? null);
        this.historyLifetimePnl.set(pos.lifetime_pnl_base);
        this.historyLifetimeReturn.set(pos.lifetime_return_pct ?? null);
        this.historyRows.set([]);
        this.historyVisible.set(true);
        this.api.overviewTransactions(pos.symbol).subscribe({
            next: (rows) => this.historyRows.set(rows),
            error: () => this.messages.add({ severity: 'error', summary: 'History failed', detail: pos.symbol })
        });
    }

    stats(): StatCard[] {
        const ov = this.overview();
        if (!ov) return [];
        const pf = ov.portfolio;
        const ccy = pf.base_currency;
        return [
            { label: 'Net worth', value: money(pf.total_value, ccy), cls: '' },
            { label: 'Total profit', value: money(pf.total_profit, ccy), cls: pnlClass(pf.total_profit) },
            { label: 'Unrealized P&L', value: money(pf.total_unrealized_pnl, ccy), cls: pnlClass(pf.total_unrealized_pnl) },
            { label: 'Realized P&L', value: money(pf.total_realized_pnl, ccy), cls: pnlClass(pf.total_realized_pnl) },
            { label: 'Total return', value: percent(pf.total_return_pct), cls: pnlClass(pf.total_return_pct) },
            { label: 'XIRR', value: percent(pf.xirr_pct), cls: pnlClass(pf.xirr_pct) },
            { label: 'TWR', value: percent(pf.twr_pct), cls: pnlClass(pf.twr_pct) }
        ];
    }

    fmt(value: string): string {
        return money(value, this.baseCurrency);
    }
    pct(value: string | null | undefined): string {
        return percent(value);
    }
    cls(value: string | null | undefined): string {
        return pnlClass(value);
    }
}
