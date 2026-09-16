import { FieldTree, submit } from '@angular/forms/signals';
import { ToastService } from '@core/notifications/toast.service';

/** Drop-in replacement for `@angular/forms/signals`' `submit()` that also fires a translated
 * toast when the attempt is blocked by client-side field validation (required, format, length,
 * mismatch, ...). Those errors already show inline under each field via `<app-field-error>`, but
 * a blocked submit otherwise gave no feedback at all beyond that — this adds the same
 * guaranteed, can't-miss-it notification `error.interceptor.ts` already gives every server-side
 * failure. Real server errors/success are unaffected — they still go through the normal
 * `apiErrorMessageKey`/`toast.ok` paths inside `action`, which only runs when the form is valid. */
export async function submitChecked<TModel>(
  form: FieldTree<TModel>,
  toast: ToastService,
  action: Parameters<typeof submit<TModel>>[1],
): Promise<void> {
  await submit(form, action);
  if (form().invalid()) {
    toast.fail('validation.formInvalid');
  }
}
