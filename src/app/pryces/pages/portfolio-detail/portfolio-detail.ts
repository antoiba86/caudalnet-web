import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { LayoutService } from '@/app/layout/service/layout.service';
import { ImportResult, Portfolio, Position, TransactionRow } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { money, percent, pnlClass, toNum } from '../../util/format';
import { TransactionHistory } from '../components/transaction-history';

@Component({
    selector: 'app-portfolio-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        ToolbarModule,
        ButtonModule,
        ChartModule,
        TableModule,
        TagModule,
        DialogModule,
        SelectModule,
        FileUploadModule,
        MessageModule,
        ToastModule,
        ProgressSpinnerModule,
        TransactionHistory
    ],
    providers: [MessageService],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" routerLink="/portfolios" />
                <span class="text-xl font-semibold ml-2">{{ name }}</span>
            </ng-template>
            <ng-template #end>
                <p-button label="Import transactions" icon="pi pi-upload" (onClick)="openImport()" />
            </ng-template>
        </p-toolbar>

        @if (loading()) {
            <div class="flex justify-center p-8"><p-progressspinner /></div>
        } @else if (portfolio(); as pf) {
            <!-- Stat cards -->
            <div class="grid grid-cols-12 gap-8 mb-2">
                <div class="col-span-12 md:col-span-6 xl:col-span-3" *ngFor="let s of stats()">
                    <div class="card mb-0">
                        <span class="block text-muted-color font-medium mb-2">{{ s.label }}</span>
                        <div class="font-medium text-2xl" [ngClass]="s.cls">{{ s.value }}</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-8">
                <!-- Allocation chart -->
                <div class="col-span-12 xl:col-span-4">
                    <div class="card flex flex-col items-center">
                        <div class="font-semibold text-xl mb-4 self-start">Allocation</div>
                        @if (pf.positions.length) {
                            <p-chart type="doughnut" [data]="chartData()" [options]="chartOptions()"
                                class="w-full max-w-80" />
                        } @else {
                            <span class="text-muted-color p-6">No positions to chart.</span>
                        }
                    </div>
                </div>

                <!-- Positions table -->
                <div class="col-span-12 xl:col-span-8">
                    <div class="card">
                        <div class="font-semibold text-xl mb-4">Positions</div>
                        <p-table [value]="pf.positions" dataKey="symbol" [scrollable]="true">
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
                                <tr class="cursor-pointer" (click)="openHistory(pos)">
                                    <td>
                                        <div class="font-medium">{{ pos.symbol }} <i class="pi pi-history text-muted-color text-xs ml-1"></i></div>
                                        @if (pos.name) { <div class="text-muted-color text-sm">{{ pos.name }}</div> }
                                    </td>
                                    <td class="text-right">{{ pos.quantity }}</td>
                                    <td class="text-right">{{ fmt(pos.avg_cost, pos.currency) }}</td>
                                    <td class="text-right">{{ fmt(pos.price, pos.currency) }}</td>
                                    <td class="text-right">{{ fmt(pos.value_base, pf.base_currency) }}</td>
                                    <td class="text-right" [ngClass]="cls(pos.unrealized_pnl_base)">
                                        {{ fmt(pos.unrealized_pnl_base, pf.base_currency) }}
                                    </td>
                                    <td class="text-right" [ngClass]="cls(pos.realized_pnl_base)">
                                        {{ fmt(pos.realized_pnl_base, pf.base_currency) }}
                                    </td>
                                    <td class="text-right" [ngClass]="cls(pos.total_return_pct)">{{ pct(pos.total_return_pct) }}</td>
                                    <td class="text-right">
                                        <div [ngClass]="cls(pos.lifetime_pnl_base)">{{ fmt(pos.lifetime_pnl_base, pf.base_currency) }}</div>
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

                    @if (pf.closed_positions.length) {
                        <div class="card">
                            <div class="font-semibold text-xl mb-4">Closed positions (sold)</div>
                            <p-table [value]="pf.closed_positions" dataKey="symbol">
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
                                        <td class="text-right" [ngClass]="cls(c.realized_pnl_base)">
                                            {{ fmt(c.realized_pnl_base, pf.base_currency) }}
                                        </td>
                                        <td class="text-right" [ngClass]="cls(c.realized_return_pct)">{{ pct(c.realized_return_pct) }}</td>
                                        <td>@if (c.broker) { <p-tag [value]="c.broker" severity="secondary" /> }</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }

                    @if (pf.manual_assets.length) {
                        <div class="card">
                            <div class="font-semibold text-xl mb-4">Manual assets</div>
                            <p-table [value]="pf.manual_assets">
                                <ng-template #header>
                                    <tr><th>Name</th><th>Type</th><th class="text-right">Value</th></tr>
                                </ng-template>
                                <ng-template #body let-a>
                                    <tr>
                                        <td>{{ a.name }}</td>
                                        <td>{{ a.asset_type }}</td>
                                        <td class="text-right">{{ fmt(a.value_base, pf.base_currency) }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </div>
            </div>
        } @else {
            <div class="card text-center text-muted-color p-8">Portfolio not found.</div>
        }

        <!-- Import dialog -->
        <p-dialog header="Import transactions" [(visible)]="importVisible" [modal]="true" [style]="{ width: '480px' }">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-2">
                    <label for="broker">Broker (optional — auto-detected if blank)</label>
                    <p-select inputId="broker" [(ngModel)]="broker" [options]="brokerOptions" optionLabel="label"
                        optionValue="value" placeholder="Auto-detect" [showClear]="true" fluid />
                </div>
                <p-fileupload mode="basic" chooseLabel="Choose file" [auto]="false" [customUpload]="true"
                    accept=".csv,text/csv" (onSelect)="onSelect($event)" />
                @if (selectedFile) { <span class="text-muted-color text-sm">Selected: {{ selectedFile.name }}</span> }

                @if (result(); as r) {
                    <p-message severity="success" [text]="resultSummary(r)" />
                    @if (r.unresolved_symbols.length) {
                        <p-message severity="warn" [text]="'Unresolved symbols: ' + r.unresolved_symbols.join(', ')" />
                    }
                    @for (w of r.warnings; track w) { <p-message severity="warn" [text]="w" /> }
                }
            </div>
            <ng-template #footer>
                <p-button label="Close" [text]="true" (onClick)="importVisible = false" />
                <p-button label="Import" icon="pi pi-upload" [disabled]="!selectedFile || importing()" (onClick)="runImport()" />
            </ng-template>
        </p-dialog>

        <app-transaction-history
            [(visible)]="historyVisible"
            [symbol]="historySymbol()"
            [name]="historyName()"
            [rows]="historyRows()"
            [lifetimePnl]="historyLifetimePnl()"
            [lifetimeReturn]="historyLifetimeReturn()"
            [baseCurrency]="portfolio()?.base_currency ?? 'EUR'" />
    `
})
export class PortfolioDetail implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly layout = inject(LayoutService);

    name = '';
    portfolio = signal<Portfolio | null>(null);
    loading = signal(false);

    chartData = signal<any>(null);
    chartOptions = signal<any>(null);

    importVisible = false;
    importing = signal(false);
    broker: string | null = null;
    selectedFile: File | null = null;
    result = signal<ImportResult | null>(null);

    historyVisible = signal(false);
    historySymbol = signal('');
    historyName = signal<string | null>(null);
    historyRows = signal<TransactionRow[]>([]);
    historyLifetimePnl = signal('0');
    historyLifetimeReturn = signal<string | null>(null);

    brokerOptions = [
        { label: 'DEGIRO', value: 'degiro' },
        { label: 'Interactive Brokers', value: 'ibkr' },
        { label: 'JSON ledger', value: 'json' }
    ];

    // Re-theme the chart when dark mode toggles (Sakai pattern).
    private readonly themeEffect = effect(() => {
        this.layout.layoutConfig().darkTheme;
        const pf = this.portfolio();
        if (pf) {
            setTimeout(() => this.buildChart(pf), 100);
        }
    });

    ngOnInit(): void {
        this.name = this.route.snapshot.paramMap.get('name') ?? '';
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.api.get(this.name).subscribe({
            next: (pf) => {
                this.portfolio.set(pf);
                this.loading.set(false);
                this.buildChart(pf);
            },
            error: (err) => {
                this.loading.set(false);
                this.portfolio.set(null);
                if (err?.status !== 404) {
                    this.messages.add({ severity: 'error', summary: 'Load failed', detail: 'Could not reach the API.' });
                }
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
        this.api.portfolioTransactions(this.name, pos.symbol).subscribe({
            next: (rows) => this.historyRows.set(rows),
            error: () =>
                this.messages.add({ severity: 'error', summary: 'History failed', detail: pos.symbol })
        });
    }

    stats() {
        const pf = this.portfolio();
        if (!pf) return [];
        return [
            { label: 'Total value', value: money(pf.total_value, pf.base_currency), cls: '' },
            { label: 'Total profit', value: money(pf.total_profit, pf.base_currency), cls: pnlClass(pf.total_profit) },
            { label: 'Unrealized P&L', value: money(pf.total_unrealized_pnl, pf.base_currency), cls: pnlClass(pf.total_unrealized_pnl) },
            { label: 'Realized P&L', value: money(pf.total_realized_pnl, pf.base_currency), cls: pnlClass(pf.total_realized_pnl) },
            { label: 'Total return', value: percent(pf.total_return_pct), cls: pnlClass(pf.total_return_pct) },
            { label: 'XIRR', value: percent(pf.xirr_pct), cls: pnlClass(pf.xirr_pct) },
            { label: 'TWR', value: percent(pf.twr_pct), cls: pnlClass(pf.twr_pct) }
        ];
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

    private buildChart(pf: Portfolio): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--text-color');
        const positions = [...pf.positions].sort((a, b) => toNum(b.value_base) - toNum(a.value_base));
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

    fmt(value: string, currency: string): string {
        return money(value, currency);
    }
    pct(value: string | null | undefined): string {
        return percent(value);
    }
    cls(value: string | null | undefined): string {
        return pnlClass(value);
    }

    openImport(): void {
        this.result.set(null);
        this.selectedFile = null;
        this.broker = null;
        this.importVisible = true;
    }

    onSelect(event: { files: File[] }): void {
        this.selectedFile = event.files?.[0] ?? null;
        this.result.set(null);
    }

    runImport(): void {
        if (!this.selectedFile) return;
        this.importing.set(true);
        this.api.import(this.name, this.selectedFile, this.broker).subscribe({
            next: (r) => {
                this.importing.set(false);
                this.result.set(r);
                this.load();
            },
            error: (err) => {
                this.importing.set(false);
                const detail = err?.status === 422 ? 'Unrecognized file format for the selected broker.' : 'Import failed.';
                this.messages.add({ severity: 'error', summary: 'Import failed', detail });
            }
        });
    }

    resultSummary(r: ImportResult): string {
        return `Broker ${r.broker}: parsed ${r.parsed}, inserted ${r.inserted}, duplicates ${r.duplicates}.`;
    }
}
