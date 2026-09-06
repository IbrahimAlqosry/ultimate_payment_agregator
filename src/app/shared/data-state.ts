import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PageLoader } from '@shared/page-loader';

@Component({
  selector: 'app-data-state',
  imports: [TranslocoPipe, PageLoader],
  template: `
    @if (loading()) {
      <app-page-loader />
    } @else if (error()) {
      <div class="state" role="alert">
        <p>{{ 'common.error' | transloco }}</p>
        <button class="btn btn-primary" type="button" (click)="retry.emit()">
          {{ 'common.retry' | transloco }}
        </button>
      </div>
    } @else if (empty()) {
      <div class="state">{{ emptyKey() | transloco }}</div>
    }
    <div [hidden]="loading() || error() || empty()">
      <ng-content />
    </div>
  `,
})
export class DataState {
  readonly loading = input(false);
  readonly error = input(false);
  readonly empty = input(false);
  readonly emptyKey = input('common.empty');
  readonly retry = output<void>();
}
