import { Routes } from '@angular/router';
import { PortfolioDetail } from './portfolio-detail/portfolio-detail';
import { Portfolios } from './portfolios/portfolios';

export default [
    { path: '', component: Portfolios },
    { path: ':name', component: PortfolioDetail }
] as Routes;
