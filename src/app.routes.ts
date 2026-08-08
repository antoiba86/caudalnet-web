import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('./app/pryces/pages/overview/overview').then((m) => m.OverviewPage)
            },
            { path: 'portfolios', loadChildren: () => import('./app/pryces/pages/pryces.routes') },
            {
                path: 'symbol-map',
                loadComponent: () => import('./app/pryces/pages/symbol-map/symbol-map').then((m) => m.SymbolMapPage)
            }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
