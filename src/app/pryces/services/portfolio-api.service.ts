import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { CreatePortfolioBody, ImportDataResult, ImportResult, Overview, Portfolio, PortfolioSummary, SymbolMapping, TransactionInput, TransactionRow } from '../models/portfolio.models';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/portfolios`;
    private readonly symbolMapBase = `${environment.apiBaseUrl}/symbol-map`;

    overview(): Observable<Overview> {
        return this.http.get<Overview>(`${environment.apiBaseUrl}/overview`);
    }

    // Omit `symbol` for the whole ledger — including rows whose symbol never
    // resolved to a ticker, which the positions view drops because they cannot
    // be priced. That is the only way to reach them for editing or deletion.
    portfolioTransactions(name: string, symbol?: string | null): Observable<TransactionRow[]> {
        let params = new HttpParams();
        if (symbol) {
            params = params.set('symbol', symbol);
        }
        return this.http.get<TransactionRow[]>(`${this.base}/${encodeURIComponent(name)}/transactions`, { params });
    }

    overviewTransactions(symbol: string): Observable<TransactionRow[]> {
        const params = new HttpParams().set('symbol', symbol);
        return this.http.get<TransactionRow[]>(`${environment.apiBaseUrl}/overview/transactions`, {
            params
        });
    }

    list(): Observable<PortfolioSummary[]> {
        return this.http.get<PortfolioSummary[]>(this.base);
    }

    get(name: string): Observable<Portfolio> {
        return this.http.get<Portfolio>(`${this.base}/${encodeURIComponent(name)}`);
    }

    create(body: CreatePortfolioBody): Observable<PortfolioSummary> {
        return this.http.post<PortfolioSummary>(this.base, body);
    }

    delete(name: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${encodeURIComponent(name)}`);
    }

    import(name: string, file: File, broker?: string | null): Observable<ImportResult> {
        const form = new FormData();
        form.append('file', file, file.name);
        let params = new HttpParams();
        if (broker) {
            params = params.set('broker', broker);
        }
        return this.http.post<ImportResult>(`${this.base}/${encodeURIComponent(name)}/transactions`, form, { params });
    }

    addTransaction(name: string, body: TransactionInput): Observable<{ id: string }> {
        return this.http.post<{ id: string }>(`${this.base}/${encodeURIComponent(name)}/transactions/manual`, body);
    }

    updateTransaction(name: string, id: string, body: TransactionInput): Observable<void> {
        return this.http.patch<void>(`${this.base}/${encodeURIComponent(name)}/transactions/${encodeURIComponent(id)}`, body);
    }

    deleteTransaction(name: string, id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/${encodeURIComponent(name)}/transactions/${encodeURIComponent(id)}`);
    }

    exportData(portfolio?: string | null): Observable<Blob> {
        let params = new HttpParams();
        if (portfolio) {
            params = params.set('portfolio', portfolio);
        }
        return this.http.get(`${environment.apiBaseUrl}/data/export`, { params, responseType: 'blob' });
    }

    // Anonymised example file in the portfolio's own broker format. Returned as
    // a blob because Renta 4's format is a binary .xls, not text.
    exportSample(portfolio: string): Observable<Blob> {
        const params = new HttpParams().set('portfolio', portfolio);
        return this.http.get(`${environment.apiBaseUrl}/data/sample`, { params, responseType: 'blob' });
    }

    symbolMap(): Observable<SymbolMapping[]> {
        return this.http.get<SymbolMapping[]>(this.symbolMapBase);
    }

    // The key is a raw broker product name — spaces, commas, dots — so it is
    // encoded into a single path segment the API declares as `{key:path}`.
    setSymbolMapping(key: string, ticker: string): Observable<SymbolMapping> {
        return this.http.put<SymbolMapping>(`${this.symbolMapBase}/${encodeURIComponent(key)}`, { ticker });
    }

    deleteSymbolMapping(key: string): Observable<void> {
        return this.http.delete<void>(`${this.symbolMapBase}/${encodeURIComponent(key)}`);
    }

    importData(file: File): Observable<ImportDataResult> {
        const form = new FormData();
        form.append('file', file, file.name);
        return this.http.post<ImportDataResult>(`${environment.apiBaseUrl}/data/import`, form);
    }
}
