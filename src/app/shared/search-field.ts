import { Component, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-search-field',
  imports: [FormsModule, TranslocoPipe],
  template: `
    <label class="search-box">
      <img src="/icons/search.svg" width="14" height="14" alt="" />
      <input
        class="search"
        type="search"
        [ngModel]="value"
        (ngModelChange)="onInput($event)"
        [placeholder]="placeholderKey() | transloco"
        [attr.aria-label]="placeholderKey() | transloco"
      />
    </label>
  `,
})
export class SearchField {
  readonly placeholderKey = input.required<string>();
  readonly queryChange = output<string>();

  value = '';
  private readonly input$ = new Subject<string>();

  constructor() {
    this.input$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.queryChange.emit(query));
  }

  onInput(value: string): void {
    this.value = value;
    this.input$.next(value);
  }
}
