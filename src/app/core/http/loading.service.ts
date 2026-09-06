import { computed, Injectable, signal } from '@angular/core';

/** Tracks in-flight API calls and a full-screen blocking overlay. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  readonly active = computed(() => this.pending() > 0);
  readonly covering = signal(false);

  start(): void {
    this.pending.update((count) => count + 1);
  }

  stop(): void {
    this.pending.update((count) => Math.max(0, count - 1));
  }

  private coveredAt = 0;

  cover(): void {
    this.coveredAt = performance.now();
    this.covering.set(true);
  }

  uncover(): void {
    const wait = Math.max(0, 500 - (performance.now() - this.coveredAt));
    window.setTimeout(() => this.covering.set(false), wait);
  }
}
