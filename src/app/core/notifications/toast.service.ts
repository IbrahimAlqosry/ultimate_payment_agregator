import { Injectable, signal } from '@angular/core';
import { ApprovalEntity } from '@core/models';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  titleKey: string;
  bodyKey: string;
}

const MAX_TOASTS = 4;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  ok(bodyKey: string, ttlMs = 4200): void {
    this.push('success', 'toast.okTitle', bodyKey, ttlMs);
  }

  fail(bodyKey: string, ttlMs = 5600): void {
    this.push('error', 'toast.failTitle', bodyKey, ttlMs);
  }

  info(bodyKey: string, ttlMs = 4200): void {
    this.push('info', 'toast.infoTitle', bodyKey, ttlMs);
  }

  decision(entity: ApprovalEntity, decision: 'approved' | 'rejected'): void {
    this.ok(`toast.${decision}.${entity}`);
  }

  show(bodyKey: string, kind: ToastKind = 'info', ttlMs = 4200): void {
    if (kind === 'success') {
      this.ok(bodyKey, ttlMs);
      return;
    }
    if (kind === 'error') {
      this.fail(bodyKey, ttlMs);
      return;
    }
    this.info(bodyKey, ttlMs);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(kind: ToastKind, titleKey: string, bodyKey: string, ttlMs: number): void {
    const id = ++this.nextId;
    this.toasts.update((list) => [...list, { id, kind, titleKey, bodyKey }].slice(-MAX_TOASTS));
    window.setTimeout(() => this.dismiss(id), ttlMs);
  }
}
