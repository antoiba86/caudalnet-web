import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ImportResult, Portfolio, Position, TransactionInput, TransactionRow } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { downloadBlob, exportFilename } from '../../util/download';
import { money, percent, pnlClass } from '../../util/format';
import { AllocationChart } from '../components/allocation-chart';
import { ClosedPositionsTable } from '../components/closed-positions-table';
import { PositionsTable } from '../components/positions-table';
import { StatCard, StatCards } from '../components/stat-cards';
import { TransactionHistory } from '../components/transaction-history';

interface TxForm {
    id: string | null;
    date: Date;
    type: string;
    symbol: string;
    currency: string;
    quantity: string | null;
    price: string | null;
    amount: string | null;
    fee: string;
}

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
        InputTextModule,
        DatePickerModule,
        ConfirmDialogModule,
        MessageModule,
        ToastModule,
        ProgressSpinnerModule,
        StatCards,
        AllocationChart,
        PositionsTable,
        ClosedPositionsTable,
        TransactionHistory
    ],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-6 flex-wrap gap-y-3">
            <ng-template #start>
                <p-button icon="pi pi-arrow-left" [text]="true" [rounded]="true" routerLink="/portfolios" />
                <span class="text-xl font-semibold ml-2">{{ name }}</span>
            </ng-template>
            <ng-template #end>
                <!-- Wraps on narrow screens: three labelled buttons in one row overflow
                     a phone viewport, pushing the last one off the edge. -->
                <div class="flex flex-wrap justify-end gap-2">
                    <p-button label="Export" icon="pi pi-download" [outlined]="true" [disabled]="exporting()" (onClick)="exportPortfolio()" />
                    <p-button label="Add transaction" icon="pi pi-plus" [outlined]="true" (onClick)="openAdd()" />
                    <p-button label="Import transactions" icon="pi pi-upload" (onClick)="openImport()" />
                </div>
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
                    <app-positions-table title="Positions" [positions]="pf.positions" [baseCurrency]="pf.base_currency" (historyClick)="openHistory($event)" />
                    <app-closed-positions-table [closedPositions]="pf.closed_positions" [baseCurrency]="pf.base_currency" />

                    @if (pf.manual_assets.length) {
                        <div class="card">
                            <div class="font-semibold text-xl mb-4">Manual assets</div>
                            <p-table [value]="pf.manual_assets">
                                <ng-template #header>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th class="text-right">Value</th>
                                    </tr>
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
        <p-dialog header="Import transactions" [(visible)]="importVisible" [modal]="true" [style]="{ width: '480px' }" [breakpoints]="{ '768px': '95vw' }">
            <div class="flex flex-col gap-4 pt-2">
                @if (lockedBroker(); as locked) {
                    <p-message severity="info" [text]="'This portfolio holds ' + locked + ' transactions — only ' + locked + ' imports are accepted.'" />
                } @else {
                    <div class="flex flex-col gap-2">
                        <label for="broker">Broker (optional — auto-detected if blank)</label>
                        <p-select inputId="broker" [(ngModel)]="broker" [options]="brokerOptions" optionLabel="label" optionValue="value" placeholder="Auto-detect" [showClear]="true" appendTo="body" fluid />
                    </div>
                }
                <p-fileupload mode="basic" chooseLabel="Choose file" [auto]="false" [customUpload]="true" accept=".csv,.xls,.xlsx,.json,text/csv,application/vnd.ms-excel,application/json" (onSelect)="onSelect($event)" />
                @if (selectedFile) {
                    <span class="text-muted-color text-sm">Selected: {{ selectedFile.name }}</span>
                }

                @if (result(); as r) {
                    <p-message severity="success" [text]="resultSummary(r)" />
                    @if (r.unresolved_symbols.length) {
                        <p-message severity="warn" [text]="'Unresolved symbols: ' + r.unresolved_symbols.join(', ')" />
                    }
                    @for (w of r.warnings; track w) {
                        <p-message severity="warn" [text]="w" />
                    }
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
            [baseCurrency]="portfolio()?.base_currency ?? 'EUR'"
            [editable]="true"
            (edit)="openEdit($event)"
            (remove)="confirmDelete($event)"
        />

        <!-- Add / edit transaction dialog -->
        <p-dialog [header]="tx.id ? 'Edit transaction' : 'Add transaction'" [(visible)]="txVisible" [modal]="true" [style]="{ width: '460px' }" [breakpoints]="{ '768px': '95vw' }">
            <div class="flex flex-col gap-4 pt-2">
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="tx-type">Type</label>
                        <p-select inputId="tx-type" [(ngModel)]="tx.type" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="tx-date">Date</label>
                        <p-datepicker inputId="tx-date" [(ngModel)]="tx.date" dateFormat="yy-mm-dd" appendTo="body" fluid />
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="tx-symbol">Symbol</label>
                        <input pInputText id="tx-symbol" [(ngModel)]="tx.symbol" placeholder="e.g. AAPL or ISIN" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="tx-currency">Currency</label>
                        <p-select inputId="tx-currency" [(ngModel)]="tx.currency" [options]="currencyOptions" appendTo="body" fluid />
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div class="flex flex-col gap-2">
                        <label for="tx-qty">Quantity</label>
                        <input pInputText id="tx-qty" [(ngModel)]="tx.quantity" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="tx-price">Price</label>
                        <input pInputText id="tx-price" [(ngModel)]="tx.price" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="tx-fee">Fee</label>
                        <input pInputText id="tx-fee" [(ngModel)]="tx.fee" fluid />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label for="tx-amount">Amount (for dividends / fees)</label>
                    <input pInputText id="tx-amount" [(ngModel)]="tx.amount" fluid />
                </div>
            </div>
            <ng-template #footer>
                <p-button label="Cancel" [text]="true" (onClick)="txVisible = false" />
                <p-button [label]="tx.id ? 'Save' : 'Add'" icon="pi pi-check" [disabled]="!tx.symbol || savingTx()" (onClick)="saveTransaction()" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog />
    `
})
export class PortfolioDetail implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly route = inject(ActivatedRoute);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);

    name = '';
    portfolio = signal<Portfolio | null>(null);
    loading = signal(false);

    exporting = signal(false);
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

    txVisible = false;
    savingTx = signal(false);
    tx: TxForm = this.emptyTx();

    brokerOptions = [
        { label: 'DEGIRO', value: 'degiro' },
        { label: 'Trade Republic', value: 'trade_republic' },
        { label: 'Interactive Brokers', value: 'ibkr' },
        { label: 'Renta 4 (funds .xls)', value: 'renta4' },
        { label: 'Horos (movements CSV)', value: 'horos' },
        { label: 'JSON ledger', value: 'json' }
    ];

    typeOptions = [
        { label: 'Buy', value: 'buy' },
        { label: 'Sell', value: 'sell' },
        { label: 'Dividend', value: 'dividend' },
        { label: 'Fee', value: 'fee' }
    ];

    currencyOptions = ['EUR', 'USD', 'GBP', 'JPY', 'KRW', 'HKD', 'CAD', 'AUD'];

    // The portfolio's single broker, derived from its positions (single-broker rule).
    // Null when empty or manual-only, so the import dialog leaves the broker open.
    lockedBroker = computed<string | null>(() => {
        const pf = this.portfolio();
        if (!pf) return null;
        const brokers = new Set<string>();
        for (const p of pf.positions) if (p.broker) brokers.add(p.broker);
        for (const c of pf.closed_positions) if (c.broker) brokers.add(c.broker);
        return brokers.size === 1 ? [...brokers][0] : null;
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
            error: () => this.messages.add({ severity: 'error', summary: 'History failed', detail: pos.symbol })
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

    exportPortfolio(): void {
        this.exporting.set(true);
        this.api.exportData(this.name).subscribe({
            next: (blob) => {
                this.exporting.set(false);
                downloadBlob(blob, exportFilename(this.name));
            },
            error: () => {
                this.exporting.set(false);
                this.messages.add({ severity: 'error', summary: 'Export failed', detail: 'Could not download the backup.' });
            }
        });
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
                let detail = 'Import failed.';
                if (err?.status === 409) {
                    detail = err?.error?.detail ?? 'This portfolio only accepts one broker.';
                } else if (err?.status === 422) {
                    detail = 'Unrecognized file format for the selected broker.';
                }
                this.messages.add({ severity: 'error', summary: 'Import failed', detail });
            }
        });
    }

    resultSummary(r: ImportResult): string {
        return `Broker ${r.broker}: parsed ${r.parsed}, inserted ${r.inserted}, duplicates ${r.duplicates}.`;
    }

    openAdd(): void {
        this.tx = this.emptyTx();
        this.txVisible = true;
    }

    openEdit(row: TransactionRow): void {
        this.tx = {
            id: row.id,
            date: row.date ? new Date(row.date) : new Date(),
            type: row.type,
            symbol: row.symbol,
            currency: row.currency,
            quantity: row.quantity ?? null,
            price: row.price ?? null,
            amount: row.amount ?? null,
            fee: row.fee ?? '0'
        };
        this.txVisible = true;
    }

    saveTransaction(): void {
        const body = this.toInput(this.tx);
        if (!body) return;
        this.savingTx.set(true);
        const editingId = this.tx.id;
        const request: Observable<unknown> = editingId ? this.api.updateTransaction(this.name, editingId, body) : this.api.addTransaction(this.name, body);
        request.subscribe({
            next: () => {
                this.savingTx.set(false);
                this.txVisible = false;
                this.messages.add({
                    severity: 'success',
                    summary: editingId ? 'Transaction updated' : 'Transaction added',
                    detail: body.symbol
                });
                this.afterTransactionChange();
            },
            error: (err: { error?: { detail?: string } }) => {
                this.savingTx.set(false);
                const detail = err?.error?.detail ?? 'Could not save the transaction.';
                this.messages.add({ severity: 'error', summary: 'Save failed', detail });
            }
        });
    }

    confirmDelete(row: TransactionRow): void {
        this.confirmation.confirm({
            header: 'Delete transaction',
            message: `Delete this ${row.type} of ${row.symbol} on ${row.date}? This cannot be undone.`,
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.api.deleteTransaction(this.name, row.id).subscribe({
                    next: () => {
                        this.messages.add({ severity: 'success', summary: 'Transaction deleted', detail: row.symbol });
                        this.afterTransactionChange();
                    },
                    error: (err) => {
                        const detail = err?.error?.detail ?? 'Could not delete the transaction.';
                        this.messages.add({ severity: 'error', summary: 'Delete failed', detail });
                    }
                });
            }
        });
    }

    private afterTransactionChange(): void {
        this.load();
        // Refresh the open history dialog so its rows reflect the change.
        if (this.historyVisible() && this.historySymbol()) {
            this.api.portfolioTransactions(this.name, this.historySymbol()).subscribe({
                next: (rows) => this.historyRows.set(rows)
            });
        }
    }

    private toInput(form: TxForm): TransactionInput | null {
        if (!form.symbol?.trim()) return null;
        return {
            date: this.toIsoDate(form.date),
            type: form.type,
            symbol: form.symbol.trim(),
            currency: form.currency,
            quantity: form.quantity || null,
            price: form.price || null,
            amount: form.amount || null,
            fee: form.fee || '0'
        };
    }

    private toIsoDate(value: Date): string {
        const offset = value.getTimezoneOffset();
        return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 10);
    }

    private emptyTx(): TxForm {
        return {
            id: null,
            date: new Date(),
            type: 'buy',
            symbol: '',
            currency: 'EUR',
            quantity: null,
            price: null,
            amount: null,
            fee: '0'
        };
    }
}
