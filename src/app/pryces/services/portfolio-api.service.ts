import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { CreatePortfolioBody, ImportResult, Overview, Portfolio, PortfolioSummary, TransactionInput, TransactionRow } from '../models/portfolio.models';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/portfolios`;

    overview(): Observable<Overview> {
        return this.http.get<Overview>(`${environment.apiBaseUrl}/overview`);
    }

    portfolioTransactions(name: string, symbol: string): Observable<TransactionRow[]> {
        const params = new HttpParams().set('symbol', symbol);
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
}
