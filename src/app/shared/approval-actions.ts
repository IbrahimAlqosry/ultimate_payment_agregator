import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-approval-actions',
  imports: [TranslocoPipe, RouterLink],
  template: `
    <div class="row-actions">
      @if (variant() === 'review' && viewHref()) {
        <a class="btn-review solid" [routerLink]="viewHref()">{{ 'actions.review' | transloco }}</a>
      } @else if (variant() === 'decide') {
        @if (show()) {
          <button class="btn-decide approve" type="button" (click)="approve.emit()">
            {{ 'actions.approve' | transloco }}
          </button>
          <button class="btn-decide reject" type="button" (click)="reject.emit()">
            {{ 'actions.reject' | transloco }}
          </button>
        }
      } @else if (variant() === 'edit') {
        <button class="btn-review" type="button" (click)="edit.emit()">{{ 'actions.edit' | transloco }}</button>
      } @else if (viewHref()) {
        <a class="btn-review" [routerLink]="viewHref()">
          {{ (variant() === 'manage' ? 'actions.manage' : viewKey()) | transloco }}
        </a>
      }
    </div>
  `,
  styles: `
    .row-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .btn-review {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      color: #1c1c1d;
      border: 1px solid #dcd5d5;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-review:hover {
      background: #f7f5f5;
    }
    .btn-review.solid {
      background: #1fa64d;
      border-color: #1fa64d;
      color: #fff;
      font-weight: 700;
    }
    .btn-review.solid:hover {
      background: #188a3e;
      border-color: #188a3e;
    }
    .btn-decide {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-decide.approve {
      background: #1fa64d;
      border: 0;
      color: #fff;
    }
    .btn-decide.approve:hover {
      background: #188a3e;
    }
    .btn-decide.reject {
      background: #fff;
      border: 1px solid #dcd5d5;
      color: #1c1c1d;
    }
    .btn-decide.reject:hover {
      background: #f7f5f5;
    }
  `,
})
export class ApprovalActions {
  readonly show = input(false);
  readonly viewHref = input<string | null>(null);
  readonly viewKey = input('actions.view');
  readonly variant = input<'review' | 'decide' | 'view' | 'manage' | 'edit'>('view');
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly edit = output<void>();
}
