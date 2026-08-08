import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { SymbolMapping } from '../../models/portfolio.models';
import { PortfolioApiService } from '../../services/portfolio-api.service';

/**
 * Editor for the instrument → Yahoo ticker overrides.
 *
 * Most instruments resolve automatically from the ISIN in the broker's file.
 * Some never can: the Spanish fund exports (Renta 4, Horos) carry no ISIN, and
 * Yahoo does not index the fund names, so there is nothing to search on. The
 * mapping is the only fix, and before this screen existed it lived in a JSON
 * file inside the container that nothing could reach.
 */
@Component({
    selector: 'app-symbol-map',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, MessageModule, ProgressSpinnerModule, TableModule, TagModule, ToastModule, ToolbarModule],
    providers: [MessageService, ConfirmationService],
    template: `
        <p-toast />
        <p-confirmdialog />

        <p-toolbar styleClass="mb-6 flex-wrap gap-y-3">
            <ng-template #start>
                <span class="text-xl font-semibold">Symbol map</span>
            </ng-template>
            <ng-template #end>
                <p-button label="Add mapping" icon="pi pi-plus" (onClick)="openAdd()" />
            </ng-template>
        </p-toolbar>

        <div class="card">
            <p class="text-muted-color mb-4">
                Maps a broker's product name or ISIN to the ticker used for pricing. Add an entry when an import reports an unresolved symbol — Spanish funds carry no ISIN, so they cannot be looked up automatically. Later imports of that instrument
                then resolve on their own.
            </p>

            @if (loading()) {
                <div class="flex justify-center p-8"><p-progressspinner /></div>
            } @else {
                <p-table [value]="entries()" dataKey="key" [scrollable]="true" [tableStyle]="{ 'min-width': '40rem' }">
                    <ng-template #header>
                        <tr>
                            <th>Product name or ISIN</th>
                            <th>Ticker</th>
                            <th class="text-right">Actions</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-e>
                        <tr>
                            <td class="break-words">{{ e.key }}</td>
                            <td>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-medium">{{ e.ticker }}</span>
                                    @if (e.name) {
                                        <span class="text-muted-color text-sm">{{ e.name }}</span>
                                    }
                                    @if (e.verified === false) {
                                        <p-tag value="does not price" severity="warn" />
                                    }
                                </div>
                            </td>
                            <td class="text-right whitespace-nowrap">
                                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" (onClick)="openEdit(e)" />
                                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="confirmDelete(e)" />
                            </td>
                        </tr>
                    </ng-template>
                    <ng-template #emptymessage>
                        <tr>
                            <td colspan="3" class="text-center text-muted-color p-6">No mappings yet.</td>
                        </tr>
                    </ng-template>
                </p-table>
            }
        </div>

        <p-dialog [header]="editingKey ? 'Edit mapping' : 'Add mapping'" [(visible)]="dialogVisible" [modal]="true" [style]="{ width: '520px' }" [breakpoints]="{ '768px': '95vw' }">
            <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-2">
                    <label for="sm-key">Product name or ISIN</label>
                    <input pInputText id="sm-key" [(ngModel)]="formKey" [readonly]="!!editingKey" placeholder="R4 MULTIGESTION NUMANTIA PATR. GLOBAL" fluid />
                    <small class="text-muted-color">Copy it exactly as the import reported it under “Unresolved symbols”.</small>
                </div>
                <div class="flex flex-col gap-2">
                    <label for="sm-ticker">Ticker</label>
                    <input pInputText id="sm-ticker" [(ngModel)]="formTicker" placeholder="0P000168OI.F" fluid />
                    <small class="text-muted-color">Search the fund's ISIN on Yahoo Finance to find it. Spanish funds look like <code>0P000168OI.F</code>.</small>
                </div>

                @if (saveWarning(); as w) {
                    <p-message severity="warn">
                        <span class="text-sm">{{ w }}</span>
                    </p-message>
                }
            </div>
            <ng-template #footer>
                <p-button label="Cancel" [text]="true" (onClick)="dialogVisible = false" />
                <p-button label="Save" icon="pi pi-check" [disabled]="!formKey.trim() || !formTicker.trim() || saving()" (onClick)="save()" />
            </ng-template>
        </p-dialog>
    `
})
export class SymbolMapPage implements OnInit {
    private readonly api = inject(PortfolioApiService);
    private readonly messages = inject(MessageService);
    private readonly confirmation = inject(ConfirmationService);
    private readonly route = inject(ActivatedRoute);

    entries = signal<SymbolMapping[]>([]);
    loading = signal(false);
    saving = signal(false);
    saveWarning = signal<string | null>(null);

    dialogVisible = false;
    editingKey: string | null = null;
    formKey = '';
    formTicker = '';

    ngOnInit(): void {
        this.load();
        // The import dialog links here with ?key=<unresolved symbol>, so the
        // user lands with the failing name already filled in rather than
        // retyping a 37-character fund name by hand.
        const key = this.route.snapshot.queryParamMap.get('key');
        if (key) {
            this.openAdd(key);
        }
    }

    load(): void {
        this.loading.set(true);
        this.api.symbolMap().subscribe({
            next: (entries) => {
                this.entries.set(entries);
                this.loading.set(false);
            },
            error: (err: { error?: { detail?: string } }) => {
                this.loading.set(false);
                this.messages.add({
                    severity: 'error',
                    summary: 'Load failed',
                    detail: err?.error?.detail ?? 'Could not load the symbol map.'
                });
            }
        });
    }

    openAdd(key = ''): void {
        this.editingKey = null;
        this.formKey = key;
        this.formTicker = '';
        this.saveWarning.set(null);
        this.dialogVisible = true;
    }

    openEdit(entry: SymbolMapping): void {
        this.editingKey = entry.key;
        this.formKey = entry.key;
        this.formTicker = entry.ticker;
        this.saveWarning.set(null);
        this.dialogVisible = true;
    }

    save(): void {
        const key = this.formKey.trim();
        const ticker = this.formTicker.trim();
        if (!key || !ticker) return;
        this.saving.set(true);
        this.saveWarning.set(null);
        this.api.setSymbolMapping(key, ticker).subscribe({
            next: (entry) => {
                this.saving.set(false);
                if (entry.verified === false) {
                    // Saved anyway — the API deliberately does not block on a
                    // failed lookup, since Yahoo may simply be unreachable.
                    this.saveWarning.set(`Saved, but ${entry.ticker} did not return a quote. Check the ticker, or ignore this if Yahoo is unavailable.`);
                } else {
                    this.dialogVisible = false;
                    this.messages.add({
                        severity: 'success',
                        summary: 'Mapping saved',
                        detail: entry.name ? `${entry.key} → ${entry.ticker} (${entry.name})` : `${entry.key} → ${entry.ticker}`
                    });
                }
                this.load();
            },
            error: (err: { error?: { detail?: string } }) => {
                this.saving.set(false);
                this.messages.add({
                    severity: 'error',
                    summary: 'Save failed',
                    detail: err?.error?.detail ?? 'Could not save the mapping.'
                });
            }
        });
    }

    confirmDelete(entry: SymbolMapping): void {
        this.confirmation.confirm({
            header: 'Delete mapping',
            message: `Delete the mapping for ${entry.key}? Future imports of it will go back to automatic resolution.`,
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.api.deleteSymbolMapping(entry.key).subscribe({
                    next: () => {
                        this.messages.add({ severity: 'success', summary: 'Mapping deleted', detail: entry.key });
                        this.load();
                    },
                    error: (err: { error?: { detail?: string } }) => {
                        this.messages.add({
                            severity: 'error',
                            summary: 'Delete failed',
                            detail: err?.error?.detail ?? 'Could not delete the mapping.'
                        });
                    }
                });
            }
        });
    }
}
