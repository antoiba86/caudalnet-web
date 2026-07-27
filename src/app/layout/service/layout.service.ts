import { Injectable, effect, signal, computed } from '@angular/core';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    // Kept in sync with the pre-bootstrap script in index.html, which applies the
    // stored theme before the first paint. Change one, change the other.
    static readonly STORAGE_KEY = 'caudalnet.layout';

    private static readonly DEFAULT_CONFIG: LayoutConfig = {
        preset: 'Aura',
        primary: 'emerald',
        surface: null,
        darkTheme: false,
        menuMode: 'static'
    };

    layoutConfig = signal<LayoutConfig>(LayoutService.initialConfig());

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'light' : 'dark'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        // The restored theme was already applied pre-bootstrap by index.html; this
        // keeps the class correct when that script is unavailable (e.g. in tests).
        this.toggleDarkMode();

        effect(() => {
            const config = this.layoutConfig();

            if (!this.initialized || !config) {
                this.initialized = true;
                return;
            }

            // Persisted only once the user actually changes something, so an
            // untouched install keeps following the OS colour scheme.
            this.persist(config);
            this.handleDarkModeTransition(config);
        });
    }

    // Restores the whole config, not just the theme: preset, primary colour,
    // surface and menu mode reset on reload otherwise. Falls back to the OS
    // colour scheme the first time, before any preference has been stored.
    private static initialConfig(): LayoutConfig {
        const stored = LayoutService.readStoredConfig();
        if (stored) {
            return { ...LayoutService.DEFAULT_CONFIG, ...stored };
        }
        return { ...LayoutService.DEFAULT_CONFIG, darkTheme: LayoutService.prefersDarkScheme() };
    }

    private static readStoredConfig(): Partial<LayoutConfig> | null {
        try {
            const raw = localStorage.getItem(LayoutService.STORAGE_KEY);
            return raw ? (JSON.parse(raw) as Partial<LayoutConfig>) : null;
        } catch {
            // Storage blocked or the entry is corrupt — fall back to defaults.
            return null;
        }
    }

    private static prefersDarkScheme(): boolean {
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    }

    private persist(config: LayoutConfig): void {
        try {
            localStorage.setItem(LayoutService.STORAGE_KEY, JSON.stringify(config));
        } catch {
            // Private browsing or quota exceeded — the preference just won't stick.
        }
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    toggleDarkMode(config?: LayoutConfig): void {
        const _config = config || this.layoutConfig();
        if (_config.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }
}
