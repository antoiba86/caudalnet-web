import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ImportResult, Portfolio, Position, TransactionRow } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { money, percent, pnlClass } from '../../util/format';
import { AllocationChart } from '../components/allocation-chart';
import { ClosedPositionsTable } from '../components/closed-positions-table';
import { PositionsTable } from '../components/positions-table';
import { StatCard, StatCards } from '../components/stat-cards';
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
        TableModule,
        DialogModule,
        SelectModule,
        FileUploadModule,
        MessageModule,
        ToastModule,
        ProgressSpinnerModule,
        StatCards,
        AllocationChart,
        PositionsTable,
        ClosedPositionsTable,
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
            <app-stat-cards [stats]="stats()" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 xl:col-span-4">
                    <app-allocation-chart [positions]="pf.positions" />
                </div>

                <div class="col-span-12 xl:col-span-8">
                    <app-positions-table
                        title="Positions"
                        [positions]="pf.positions"
                        [baseCurrency]="pf.base_currency"
                        (historyClick)="openHistory($event)" />
                    <app-closed-positions-table
                        [closedPositions]="pf.closed_positions"
                        [baseCurrency]="pf.base_currency" />

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
    private readonly messages = inject(MessageService);

    name = '';
    portfolio = signal<Portfolio | null>(null);
    loading = signal(false);

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

    stats(): StatCard[] {
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

    fmt(value: string, currency: string): string {
        return money(value, currency);
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
