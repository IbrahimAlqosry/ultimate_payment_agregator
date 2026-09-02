import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-approval-actions',
  imports: [TranslocoPipe, RouterLink],
  template: `
    <div class="row-actions">
      @if (viewHref()) {
        <a class="btn-review" [routerLink]="viewHref()">{{ viewKey() | transloco }}</a>
      }
      @if (show()) {
        <button class="btn btn-teal btn-sm" type="button" (click)="approve.emit()">
          {{ 'actions.approve' | transloco }}
        </button>
        <button class="btn btn-ghost btn-sm" type="button" (click)="reject.emit()">
          {{ 'actions.reject' | transloco }}
        </button>
      }
    </div>
  `,
  styles: `
    .row-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .btn-review {
      display: inline-flex;
      align-items: center;
      background: #e8f6ed;
      color: #1fa64d;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
  `,
})
export class ApprovalActions {
  readonly show = input(false);
  readonly viewHref = input<string | null>(null);
  readonly viewKey = input('actions.view');
  readonly approve = output<void>();
  readonly reject = output<void>();
}
