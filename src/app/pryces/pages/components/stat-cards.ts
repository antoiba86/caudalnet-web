import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

export interface StatCard {
    label: string;
    value: string;
    cls: string;
}

@Component({
    selector: 'app-stat-cards',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="grid grid-cols-12 gap-8 mb-2">
            <div class="col-span-12 md:col-span-6 xl:col-span-3" *ngFor="let s of stats()">
                <div class="card mb-0">
                    <span class="block text-muted-color font-medium mb-2">{{ s.label }}</span>
                    <div class="font-medium text-2xl" [ngClass]="s.cls">{{ s.value }}</div>
                </div>
            </div>
        </div>
    `
})
export class StatCards {
    stats = input<StatCard[]>([]);
}
