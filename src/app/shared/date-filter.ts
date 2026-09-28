import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * A date filter with a translated placeholder ("From Date" / "من تاريخ"). A native
 * `<input type="date">` ignores `placeholder` and always paints the browser's own "mm/dd/yyyy"
 * in the browser's UI language, so while it's empty (and not being edited) that text is hidden
 * and our label is drawn over it. The native picker and calendar icon still work as usual.
 */
@Component({
  selector: 'app-date-filter',
  imports: [TranslocoPipe],
  template: `
    <label class="date-filter" [class.empty]="!value()">
      <input type="date" [value]="value()" (change)="onChange($event)" [attr.aria-label]="placeholderKey() | transloco" />
      <span class="date-ph" aria-hidden="true">{{ placeholderKey() | transloco }}</span>
    </label>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .date-filter {
      position: relative;
      display: flex;
      flex: 1;
    }
    input {
      width: 100%;
      min-width: 160px;
      height: 40px;
      border: 1px solid #dcd5d5;
      background: #fff;
      border-radius: 8px;
      padding: 0 14px;
      font-family: inherit;
      font-size: 13px;
      color: #444445;
    }
    .date-ph {
      display: none;
      position: absolute;
      inset-inline-start: 15px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 13px;
      color: #7e7676;
      pointer-events: none;
    }
    /* In RTL the native calendar icon sits on the start side — clear it. */
    :host-context([dir='rtl']) .date-ph {
      inset-inline-start: 38px;
    }
    .date-filter.empty:not(:focus-within) input {
      color: transparent;
    }
    .date-filter.empty:not(:focus-within) .date-ph {
      display: block;
    }
  `,
})
export class DateFilter {
  /** `YYYY-MM-DD`, or '' for no date. */
  readonly value = input('');
  readonly placeholderKey = input.required<string>();
  readonly valueChange = output<string>();

  onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
