import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { LayoutService } from '@/app/layout/service/layout.service';
import { Overview, Position, TransactionRow } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { money, percent, pnlClass, toNum } from '../../util/format';
import { TransactionHistory } from '../components/transaction-history';

@Component({
    selector: 'app-overview',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ChartModule,
        TableModule,
        TagModule,
        ToastModule,
        ProgressSpinnerModule,
        TransactionHistory
    ],
    providers: [MessageService],
    template: `
        <p-toast />
        <div class="mb-6 text-2xl font-semibold">Net worth — all portfolios</div>

        @if (loading()) {
            <div class="flex justify-center p-8"><p-progressspinner /></div>
        } @else if (overview(); as ov) {
            <div class="grid grid-cols-12 gap-8 mb-2">
                <div class="col-span-12 md:col-span-6 xl:col-span-3" *ngFor="let s of stats()">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-2">{{ s.label }}</span>
                        <div class="font-medium text-2xl" [ngClass]="s.cls">{{ s.value }}</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-4">
                    <div class="card flex flex-col items-center">
                        <div class="font-semibold text-xl mb-4 self-start">Allocation</div>
                        @if (ov.portfolio.positions.length) {
                            <p-chart type="doughnut" [data]="chartData()" [options]="chartOptions()"
                                class="w-full max-w-80" />
                        } @else {
                            <span class="text-muted-color p-6">No positions to chart.</span>
                        }
                    </div>

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
                                <tr><td colspan="4" class="text-center text-muted-color p-6">No portfolios yet.</td></tr>
                            </ng-template>
                        </p-table>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-8">
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Holdings (all portfolios)</div>
                        <p-table [value]="ov.portfolio.positions" dataKey="symbol" [scrollable]="true">
                            <ng-template #header>
                                <tr>
                                    <th>Symbol</th>
                                    <th class="text-right">Qty</th>
                                    <th class="text-right">Price</th>
                                    <th class="text-right">Value</th>
                                    <th class="text-right">Unrealized</th>
                                    <th class="text-right">Return</th>
                                    <th class="text-right">Lifetime</th>
                                    <th>Broker</th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-pos>
                                <tr class="cursor-pointer" (click)="openHistory(pos)">
                                    <td>
                                        <div class="font-medium">{{ pos.symbol }} <i class="pi pi-history text-muted-color text-xs ml-1"></i></div>
                                        @if (pos.name) { <div class="text-muted-color text-sm">{{ pos.name }}</div> }
                                    </td>
                                    <td class="text-right">{{ pos.quantity }}</td>
                                    <td class="text-right">{{ fmtCcy(pos.price, pos.currency) }}</td>
                                    <td class="text-right">{{ fmt(pos.value_base) }}</td>
                                    <td class="text-right" [ngClass]="cls(pos.unrealized_pnl_base)">{{ fmt(pos.unrealized_pnl_base) }}</td>
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
                                <tr><td colspan="8" class="text-center text-muted-color p-6">No holdings yet. Create a portfolio and import transactions.</td></tr>
                            </ng-template>
                        </p-table>
                    </div>

                    @if (ov.portfolio.closed_positions.length) {
                        <div class="card">
                            <div class="font-semibold text-xl mb-4">Closed positions (sold)</div>
                            <p-table [value]="ov.portfolio.closed_positions" dataKey="symbol">
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
                                            @if (c.name) { <div class="text-muted-color text-sm">{{ c.name }}</div> }
                                        </td>
                                        <td class="text-right">{{ holdPeriod(c.hold_period_days) }}</td>
                                        <td class="text-right" [ngClass]="cls(c.realized_pnl_base)">{{ fmt(c.realized_pnl_base) }}</td>
                                        <td class="text-right" [ngClass]="cls(c.realized_return_pct)">{{ pct(c.realized_return_pct) }}</td>
                                        <td>@if (c.broker) { <p-tag [value]="c.broker" severity="secondary" /> }</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
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
            [showPortfolio]="true" />
    `
})
export class OverviewPage implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly messages = inject(MessageService);
    private readonly layout = inject(LayoutService);

    overview = signal<Overview | null>(null);
    loading = signal(false);
    chartData = signal<any>(null);
    chartOptions = signal<any>(null);

    historyVisible = signal(false);
    historySymbol = signal('');
    historyName = signal<string | null>(null);
    historyRows = signal<TransactionRow[]>([]);
    historyLifetimePnl = signal('0');
    historyLifetimeReturn = signal<string | null>(null);

    private get baseCurrency(): string {
        return this.overview()?.portfolio.base_currency ?? 'EUR';
    }

    private readonly themeEffect = effect(() => {
        this.layout.layoutConfig().darkTheme;
        const ov = this.overview();
        if (ov) {
            setTimeout(() => this.buildChart(ov), 100);
        }
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.api.overview().subscribe({
            next: (ov) => {
                this.overview.set(ov);
                this.loading.set(false);
                this.buildChart(ov);
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
            error: () =>
                this.messages.add({ severity: 'error', summary: 'History failed', detail: pos.symbol })
        });
    }

    stats() {
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

    private buildChart(ov: Overview): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--text-color');
        const positions = [...ov.portfolio.positions].sort((a, b) => toNum(b.value_base) - toNum(a.value_base));
        const palette = ['--p-primary-500', '--p-primary-300', '--p-primary-200', '--p-cyan-400', '--p-orange-400', '--p-purple-400', '--p-pink-400', '--p-teal-400'];
        const colors = positions.map((_, i) => style.getPropertyValue(palette[i % palette.length]).trim());
        this.chartData.set({
            labels: positions.map((p) => p.symbol),
            datasets: [{ data: positions.map((p) => toNum(p.value_base)), backgroundColor: colors }]
        });
        this.chartOptions.set({
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: { legend: { labels: { color: textColor, usePointStyle: true } } }
        });
    }

    fmt(value: string): string {
        return money(value, this.baseCurrency);
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
