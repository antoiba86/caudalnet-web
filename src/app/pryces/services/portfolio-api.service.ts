import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { CreatePortfolioBody, ImportResult, Portfolio, PortfolioSummary } from '../models/portfolio.models';

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiBaseUrl}/portfolios`;

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
        return this.http.post<ImportResult>(
            `${this.base}/${encodeURIComponent(name)}/transactions`,
            form,
            { params }
        );
    }
}
