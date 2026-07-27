import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { ImportDataResult, PortfolioSummary } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';
import { downloadBlob, exportFilename } from '../../util/download';

@Component({
    selector: 'app-portfolios',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ToolbarModule, ButtonModule, DialogModule, FileUploadModule, InputTextModule, MessageModule, ToastModule, ConfirmDialogModule, ProgressSpinnerModule],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast />
        <p-confirmdialog [style]="{ width: '450px' }" />

        <div class="card">
            <p-toolbar styleClass="mb-6 flex-wrap gap-y-3">
                <ng-template #start>
                    <span class="text-xl font-semibold">Portfolios</span>
                </ng-template>
                <ng-template #end>
                    <!-- Wraps on narrow screens; see portfolio-detail for the same reason. -->
                    <div class="flex flex-wrap justify-end gap-2">
                        <p-button label="Export" icon="pi pi-download" [outlined]="true" [disabled]="exporting()" (onClick)="exportAll()" />
                        <p-button label="Import" icon="pi pi-upload" [outlined]="true" (onClick)="openImportBackup()" />
                        <p-button label="New portfolio" icon="pi pi-plus" (onClick)="openCreate()" />
                    </div>
                </ng-template>
            </p-toolbar>

            @if (loading()) {
                <div class="flex justify-center p-8"><p-progressspinner /></div>
            } @else {
                <p-table [value]="portfolios()" [paginator]="portfolios().length > 10" [rows]="10" dataKey="name">
                    <ng-template #header>
                        <tr>
                            <th>Name</th>
                            <th>Base currency</th>
                            <th class="text-right">Transactions</th>
                            <th style="width: 8rem"></th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-p>
                        <tr class="cursor-pointer" (click)="open(p)">
                            <td class="font-medium">{{ p.name }}</td>
                            <td>{{ p.base_currency }}</td>
                            <td class="text-right">{{ p.transaction_count }}</td>
                            <td class="text-right">
                                <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="confirmDelete($event, p)" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="4" class="text-center text-muted-color p-6">No portfolios yet. Create one to get started.</td>
                        </tr>
                    </ng-template>
                </p-table>
            }
        </div>

        <p-dialog header="New portfolio" [(visible)]="createVisible" [modal]="true" [style]="{ width: '420px' }" [breakpoints]="{ '768px': '95vw' }">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-2">
                    <label for="ccy">Base currency *</label>
                    <input pInputText id="ccy" [(ngModel)]="form.base_currency" placeholder="EUR" maxlength="3" fluid />
                </div>
                <div class="flex flex-col gap-2">
                    <label for="pname">Name (optional)</label>
                    <input pInputText id="pname" [(ngModel)]="form.name" placeholder="auto" fluid />
                </div>
            </div>
            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="createVisible = false" />
                <p-button label="Create" icon="pi pi-check" [disabled]="!canCreate() || saving()" (onClick)="create()" />
            </ng-template>
        </p-dialog>

        <!-- Import backup dialog -->
        <p-dialog header="Import backup" [(visible)]="importVisible" [modal]="true" [style]="{ width: '480px' }" [breakpoints]="{ '768px': '95vw' }">
            <div class="flex flex-col gap-4 pt-2">
                <span class="text-muted-color text-sm">Restore a pryces export file. Missing portfolios are created; existing ones are merged with duplicate transactions skipped.</span>
                <p-fileupload mode="basic" chooseLabel="Choose file" [auto]="false" [customUpload]="true" accept=".json,application/json" (onSelect)="onImportSelect($event)" />
                @if (selectedImportFile) {
                    <span class="text-muted-color text-sm">Selected: {{ selectedImportFile.name }}</span>
                }

                @if (importResult(); as r) {
                    <p-message severity="success" [text]="importSummary(r)" />
                    @for (w of r.warnings; track w) {
                        <p-message severity="warn" [text]="w" />
                    }
                }
            </div>
            <ng-template #footer>
                <p-button label="Close" [text]="true" (onClick)="importVisible = false" />
                <p-button label="Import" icon="pi pi-upload" [disabled]="!selectedImportFile || importing()" (onClick)="runImportBackup()" />
            </ng-template>
        </p-dialog>
    `
})
export class Portfolios implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    private readonly confirm = inject(ConfirmationService);

    portfolios = signal<PortfolioSummary[]>([]);
    loading = signal(false);
    saving = signal(false);

    createVisible = false;
    form: { base_currency: string; name: string } = { base_currency: '', name: '' };

    exporting = signal(false);
    importVisible = false;
    importing = signal(false);
    selectedImportFile: File | null = null;
    importResult = signal<ImportDataResult | null>(null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.api.list().subscribe({
            next: (rows) => {
                this.portfolios.set(rows);
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

    open(p: PortfolioSummary): void {
        this.router.navigate(['/portfolios', p.name]);
    }

    openCreate(): void {
        this.form = { base_currency: '', name: '' };
        this.createVisible = true;
    }

    canCreate(): boolean {
        return this.form.base_currency.trim().length >= 3;
    }

    create(): void {
        this.saving.set(true);
        this.api
            .create({
                base_currency: this.form.base_currency.trim().toUpperCase(),
                name: this.form.name.trim() || null
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.createVisible = false;
                    this.messages.add({ severity: 'success', summary: 'Created', detail: 'Portfolio created' });
                    this.load();
                },
                error: (err) => {
                    this.saving.set(false);
                    const detail = err?.status === 409 ? 'A portfolio with that name already exists.' : 'Could not create portfolio.';
                    this.messages.add({ severity: 'error', summary: 'Create failed', detail });
                }
            });
    }

    exportAll(): void {
        this.exporting.set(true);
        this.api.exportData().subscribe({
            next: (blob) => {
                this.exporting.set(false);
                downloadBlob(blob, exportFilename());
            },
            error: () => {
                this.exporting.set(false);
                this.messages.add({ severity: 'error', summary: 'Export failed', detail: 'Could not download the backup.' });
            }
        });
    }

    openImportBackup(): void {
        this.selectedImportFile = null;
        this.importResult.set(null);
        this.importVisible = true;
    }

    onImportSelect(event: { files: File[] }): void {
        this.selectedImportFile = event.files?.[0] ?? null;
        this.importResult.set(null);
    }

    runImportBackup(): void {
        if (!this.selectedImportFile) return;
        this.importing.set(true);
        this.api.importData(this.selectedImportFile).subscribe({
            next: (r) => {
                this.importing.set(false);
                this.importResult.set(r);
                this.load();
            },
            error: (err) => {
                this.importing.set(false);
                let detail = 'Import failed.';
                if (err?.status === 400) {
                    detail = 'The file is not valid JSON.';
                } else if (err?.status === 422) {
                    detail = err?.error?.detail ?? 'The file is not a pryces export.';
                }
                this.messages.add({ severity: 'error', summary: 'Import failed', detail });
            }
        });
    }

    importSummary(r: ImportDataResult): string {
        return `Portfolios: ${r.portfolios_created} created, ${r.portfolios_merged} merged, ${r.portfolios_skipped} skipped. Transactions: ${r.transactions_added} added, ${r.transactions_skipped} duplicates skipped. Manual assets replaced: ${r.manual_assets_replaced}.`;
    }

    confirmDelete(event: Event, p: PortfolioSummary): void {
        event.stopPropagation();
        this.confirm.confirm({
            target: event.target as EventTarget,
            message: `Delete portfolio "${p.name}"? This cannot be undone.`,
            header: 'Confirm delete',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonProps: { severity: 'danger', label: 'Delete' },
            rejectButtonProps: { label: 'Cancel', text: true },
            accept: () => {
                this.api.delete(p.name).subscribe({
                    next: () => {
                        this.messages.add({ severity: 'success', summary: 'Deleted', detail: p.name });
                        this.load();
                    },
                    error: () => this.messages.add({ severity: 'error', summary: 'Delete failed', detail: p.name })
                });
            }
        });
    }
}
