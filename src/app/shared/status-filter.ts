import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-status-filter',
  imports: [TranslocoPipe],
  template: `
    <label class="status-filter">
      <span class="visually-hidden">{{ labelKey() | transloco }}</span>
      <select [value]="value()" (change)="onChange($event)">
        <option value="all">{{ labelKey() | transloco }}</option>
        @for (option of options(); track option) {
          <option [value]="option">{{ (prefix() + option) | transloco }}</option>
        }
      </select>
    </label>
  `,
  styles: `
    .status-filter select {
      height: 40px;
      border: 1px solid #dcd5d5;
      background: #fff;
      border-radius: 8px;
      padding: 0 14px;
      font-size: 13px;
      color: #444445;
    }
  `,
})
export class StatusFilter {
  readonly labelKey = input('filters.status');
  readonly prefix = input('badge.');
  readonly value = input('all');
  readonly options = input<string[]>(['pending', 'approved', 'rejected']);
  readonly valueChange = output<string>();

  onChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.valueChange.emit(target.value);
  }
}
