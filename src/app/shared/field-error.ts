import { Component, Signal, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-field-error',
  imports: [TranslocoPipe],
  template: `
    @if (visible()) {
      <p class="field-error" role="alert">{{ key() | transloco: params() }}</p>
    }
  `,
  styles: `
    .field-error {
      margin: 0;
      color: #b42318;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
    }
  `,
})
export class FieldError {
  readonly state = input.required<{
    touched: Signal<boolean>;
    invalid: Signal<boolean>;
    errors: Signal<readonly { kind: string }[]>;
  }>();

  readonly visible = computed(() => {
    const field = this.state();
    return field.touched() && field.invalid();
  });

  readonly key = computed(() => {
    const err = this.state().errors()[0];
    return err ? `validation.${err.kind}` : 'validation.required';
  });

  readonly params = computed(() => {
    const err = this.state().errors()[0] as { minLength?: number } | undefined;
    if (err?.minLength != null) {
      return { min: err.minLength };
    }
    return {};
  });
}
