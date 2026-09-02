import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
  });

  it('stores friendly i18n keys for success and error', () => {
    toast.ok('toast.welcome');
    toast.fail('toast.loginBad');

    const items = toast.toasts();
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('success');
    expect(items[0].titleKey).toBe('toast.okTitle');
    expect(items[0].bodyKey).toBe('toast.welcome');
    expect(items[1].kind).toBe('error');
    expect(items[1].titleKey).toBe('toast.failTitle');
    expect(items[1].bodyKey).toBe('toast.loginBad');
  });

  it('maps approve and reject onto entity-specific copy keys', () => {
    toast.decision('merchant', 'approved');
    toast.decision('point', 'rejected');

    expect(toast.toasts()[0].bodyKey).toBe('toast.approved.merchant');
    expect(toast.toasts()[1].bodyKey).toBe('toast.rejected.point');
  });

  it('dismisses a toast by id', () => {
    toast.ok('toast.welcome');
    const id = toast.toasts()[0].id;
    toast.dismiss(id);
    expect(toast.toasts()).toHaveLength(0);
  });
});
