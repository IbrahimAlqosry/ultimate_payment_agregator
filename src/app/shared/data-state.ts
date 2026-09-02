import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-data-state',
  imports: [TranslocoPipe],
  template: `
    @if (loading()) {
      <div class="state state-loading" role="status">
        <span class="spinner" aria-hidden="true"></span>
        {{ 'common.loading' | transloco }}
      </div>
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
