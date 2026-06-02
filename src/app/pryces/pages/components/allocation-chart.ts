import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { LayoutService } from '@/app/layout/service/layout.service';
import { Position } from '../../models/portfolio.models';
import { toNum } from '../../util/format';

@Component({
    selector: 'app-allocation-chart',
    standalone: true,
    imports: [CommonModule, ChartModule],
    template: `
        <div class="card flex flex-col items-center">
            <div class="font-semibold text-xl mb-4 self-start">Allocation</div>
            @if (positions().length) {
                <p-chart type="doughnut" [data]="chartData()" [options]="chartOptions()" class="w-full max-w-80" />
            } @else {
                <span class="text-muted-color p-6">No positions to chart.</span>
            }
        </div>
    `
})
export class AllocationChart {
    private readonly layout = inject(LayoutService);

    positions = input<Position[]>([]);
    chartData = signal<any>(null);
    chartOptions = signal<any>(null);

    // Rebuild when the data changes or dark mode toggles (Sakai chart pattern).
    private readonly rebuild = effect(() => {
        this.positions();
        this.layout.layoutConfig().darkTheme;
        setTimeout(() => this.build(), 100);
    });

    private build(): void {
        const style = getComputedStyle(document.documentElement);
        const textColor = style.getPropertyValue('--text-color');
        const positions = [...this.positions()].sort((a, b) => toNum(b.value_base) - toNum(a.value_base));
        const palette = ['--p-primary-500', '--p-primary-300', '--p-primary-200', '--p-cyan-400', '--p-orange-400', '--p-purple-400', '--p-pink-400', '--p-teal-400'];
        const colors = positions.map((_, i) => style.getPropertyValue(palette[i % palette.length]).trim());
        this.chartData.set({
            labels: positions.map((p) => p.symbol),
            datasets: [{ data: positions.map((p) => toNum(p.value_base)), backgroundColor: colors }]
        });
        this.chartOptions.set({
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: { legend: { labels: { color: textColor, usePointStyle: true } } }
        });
    }
}
