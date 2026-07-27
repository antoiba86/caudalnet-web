import { TestBed } from '@angular/core/testing';

import { LayoutService } from './layout.service';

describe('LayoutService', () => {
    const create = () => TestBed.runInInjectionContext(() => new LayoutService());

    beforeEach(() => {
        localStorage.removeItem(LayoutService.STORAGE_KEY);
        document.documentElement.classList.remove('app-dark');
        TestBed.configureTestingModule({});
    });

    afterEach(() => {
        localStorage.removeItem(LayoutService.STORAGE_KEY);
        document.documentElement.classList.remove('app-dark');
    });

    describe('with no stored preference', () => {
        it('follows the operating system colour scheme', () => {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            expect(create().isDarkTheme()).toBe(prefersDark);
        });

        it('does not write to storage until something changes', () => {
            create();

            expect(localStorage.getItem(LayoutService.STORAGE_KEY)).toBeNull();
        });
    });

    describe('with a stored preference', () => {
        it('restores the theme over the system default', () => {
            localStorage.setItem(LayoutService.STORAGE_KEY, JSON.stringify({ darkTheme: true }));

            expect(create().isDarkTheme()).toBeTrue();
        });

        it('applies the dark class on startup', () => {
            localStorage.setItem(LayoutService.STORAGE_KEY, JSON.stringify({ darkTheme: true }));
            create();

            expect(document.documentElement.classList.contains('app-dark')).toBeTrue();
        });

        it('restores the rest of the config, not just the theme', () => {
            localStorage.setItem(LayoutService.STORAGE_KEY, JSON.stringify({ primary: 'indigo', menuMode: 'overlay' }));
            const service = create();

            expect(service.getPrimary()).toBe('indigo');
            expect(service.isOverlay()).toBeTrue();
        });

        it('fills unknown fields from the defaults', () => {
            localStorage.setItem(LayoutService.STORAGE_KEY, JSON.stringify({ darkTheme: true }));

            expect(create().layoutConfig().preset).toBe('Aura');
        });

        it('falls back to defaults when the entry is corrupt', () => {
            localStorage.setItem(LayoutService.STORAGE_KEY, 'not json');

            expect(() => create()).not.toThrow();
        });
    });

    describe('persistence', () => {
        it('stores the config once it changes', () => {
            const service = create();

            service.layoutConfig.update((config) => ({ ...config, darkTheme: true, primary: 'indigo' }));
            TestBed.tick();

            const stored = JSON.parse(localStorage.getItem(LayoutService.STORAGE_KEY)!);
            expect(stored.darkTheme).toBeTrue();
            expect(stored.primary).toBe('indigo');
        });
    });
});
