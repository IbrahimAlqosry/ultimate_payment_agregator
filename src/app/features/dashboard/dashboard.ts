import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AtlasApi } from '@core/http/atlas-api';
import { DashboardPayload } from '@core/models';
import { DataState } from '@shared/data-state';

const WEEK_KEYS = ['week.sat', 'week.sun', 'week.mon', 'week.tue', 'week.wed', 'week.thu', 'week.fri'];

export type DashRange = 'hour' | 'day' | 'today' | 'week' | 'month';

@Component({
  selector: 'app-dashboard',
  imports: [TranslocoPipe, DecimalPipe, DatePipe, DataState, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly api = inject(AtlasApi);
  readonly auth = inject(AuthService);
  readonly weekKeys = WEEK_KEYS;
  readonly highlightIndex = 2;
  readonly ranges: { id: DashRange; key: string }[] = [
    { id: 'hour', key: 'dashboard.range.hour' },
    { id: 'day', key: 'dashboard.range.day' },
    { id: 'today', key: 'dashboard.range.today' },
    { id: 'week', key: 'dashboard.range.week' },
    { id: 'month', key: 'dashboard.range.month' },
  ];
  readonly timeRange = signal<DashRange>('week');

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<DashboardPayload | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.dashboard().subscribe({
      next: (payload) => {
        this.data.set(payload);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  barHeight(value: number, series: number[]): string {
    const max = Math.max(...series, 1);
    return `${Math.round((value / max) * 100)}%`;
  }
}
