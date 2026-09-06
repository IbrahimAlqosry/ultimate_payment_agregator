import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastKind, ToastService } from '@core/notifications/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [TranslocoPipe],
  template: `
    <div class="toast-host">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="toast"
          [class.toast-ok]="toast.kind === 'success'"
          [class.toast-error]="toast.kind === 'error'"
          [class.toast-info]="toast.kind === 'info'"
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
          [attr.aria-live]="toast.kind === 'error' ? 'assertive' : 'polite'"
        >
          <img class="toast-icon" [src]="iconFor(toast.kind)" width="24" height="24" alt="" />
          <div class="toast-copy">
            <p class="toast-title">{{ toast.titleKey | transloco }}</p>
            <p class="toast-body">{{ toast.bodyKey | transloco }}</p>
          </div>
          <button
            type="button"
            class="toast-dismiss"
            (click)="toasts.dismiss(toast.id)"
            [attr.aria-label]="'common.dismiss' | transloco"
          >
            <img src="icons/circle-x.svg" width="16" height="16" alt="" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-host {
      position: fixed;
      inset-block-end: max(20px, env(safe-area-inset-bottom, 0px));
      inset-inline-end: max(12px, env(safe-area-inset-right, 0px));
      inset-inline-start: max(12px, env(safe-area-inset-left, 0px));
      z-index: 80;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: auto;
      max-width: 380px;
      margin-inline-start: auto;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 14px 14px 16px;
      background: #fff;
      color: #1c1c1d;
      border: 1px solid #dcd5d5;
      border-inline-start: 4px solid #2980b9;
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(28, 28, 29, 0.12);
      animation: toast-in 0.28s ease-out;
    }

    .toast-ok {
      background: #e8f6ed;
      border-color: #cfe9d8;
      border-inline-start-color: #1fa64d;
    }

    .toast-error {
      background: #fef5ec;
      border-color: #f3e0cc;
      border-inline-start-color: #e67e22;
    }

    .toast-info {
      background: #eef4fc;
      border-color: #d2e3f7;
      border-inline-start-color: #2980b9;
    }

    .toast-icon {
      flex: 0 0 24px;
      margin-top: 1px;
    }

    .toast-copy {
      flex: 1 1 auto;
      min-width: 0;
    }

    .toast-title {
      margin: 0 0 4px;
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .toast-body {
      margin: 0;
      font-size: 0.8125rem;
      line-height: 1.45;
      color: #4a4545;
    }

    .toast-dismiss {
      flex: 0 0 auto;
      border: 0;
      background: transparent;
      padding: 2px;
      cursor: pointer;
      opacity: 0.7;
      line-height: 0;
    }

    .toast-dismiss:hover,
    .toast-dismiss:focus-visible {
      opacity: 1;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }
  `,
})
export class ToastHost {
  readonly toasts = inject(ToastService);

  iconFor(kind: ToastKind): string {
    if (kind === 'success') {
      return 'icons/check-circle.svg';
    }
    if (kind === 'error') {
      return 'icons/shield-alert.svg';
    }
    return 'icons/bell.svg';
  }
}
