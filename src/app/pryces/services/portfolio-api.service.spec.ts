import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { TransactionInput } from '../models/portfolio.models';
import { PortfolioApiService } from './portfolio-api.service';

describe('PortfolioApiService', () => {
    let service: PortfolioApiService;
    let http: HttpTestingController;
    const base = `${environment.apiBaseUrl}/portfolios`;

    const body: TransactionInput = {
        date: '2024-02-01',
        type: 'buy',
        symbol: 'AAPL',
        currency: 'USD',
        quantity: '3',
        price: '50',
        fee: '0.5'
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PortfolioApiService, provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(PortfolioApiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('addTransaction POSTs the body to the manual endpoint', () => {
        service.addTransaction('main', body).subscribe();
        const req = http.expectOne(`${base}/main/transactions/manual`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        req.flush({ id: 'new-id' });
    });

    it('updateTransaction PATCHes the addressed row', () => {
        service.updateTransaction('main', 'abc', body).subscribe();
        const req = http.expectOne(`${base}/main/transactions/abc`);
        expect(req.request.method).toBe('PATCH');
        expect(req.request.body).toEqual(body);
        req.flush(null);
    });

    it('deleteTransaction DELETEs the addressed row', () => {
        service.deleteTransaction('main', 'abc').subscribe();
        const req = http.expectOne(`${base}/main/transactions/abc`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('import POSTs multipart form data with the broker query param', () => {
        const file = new File(['{}'], 'ledger.json', { type: 'application/json' });
        service.import('main', file, 'degiro').subscribe();
        const req = http.expectOne((r) => r.url === `${base}/main/transactions` && r.params.get('broker') === 'degiro');
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBeTrue();
        req.flush({});
    });

    it('import omits the broker param when none is given', () => {
        const file = new File(['{}'], 'ledger.json', { type: 'application/json' });
        service.import('main', file, null).subscribe();
        const req = http.expectOne(`${base}/main/transactions`);
        expect(req.request.params.has('broker')).toBeFalse();
        req.flush({});
    });

    it('portfolioTransactions filters by the symbol query param', () => {
        service.portfolioTransactions('main', 'AAPL').subscribe();
        const req = http.expectOne((r) => r.url === `${base}/main/transactions` && r.params.get('symbol') === 'AAPL');
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('exportData GETs the export as a blob without params by default', () => {
        service.exportData().subscribe();
        const req = http.expectOne(`${environment.apiBaseUrl}/data/export`);
        expect(req.request.method).toBe('GET');
        expect(req.request.responseType).toBe('blob');
        expect(req.request.params.has('portfolio')).toBeFalse();
        req.flush(new Blob(['{}'], { type: 'application/json' }));
    });

    it('exportData scopes the export with the portfolio query param', () => {
        service.exportData('main').subscribe();
        const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/data/export` && r.params.get('portfolio') === 'main');
        expect(req.request.method).toBe('GET');
        req.flush(new Blob(['{}'], { type: 'application/json' }));
    });

    it('importData POSTs the export file as multipart form data', () => {
        const file = new File(['{}'], 'pryces_export_20260713.json', { type: 'application/json' });
        service.importData(file).subscribe();
        const req = http.expectOne(`${environment.apiBaseUrl}/data/import`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body instanceof FormData).toBeTrue();
        req.flush({});
    });

    it('URL-encodes the portfolio name', () => {
        service.get('my port').subscribe();
        const req = http.expectOne(`${base}/my%20port`);
        expect(req.request.method).toBe('GET');
        req.flush({});
    });
});
