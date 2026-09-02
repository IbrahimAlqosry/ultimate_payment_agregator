import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { email, form, minLength, required } from '@angular/forms/signals';
import { applyPasswordRules, applyPhoneRules } from './field-rules';

describe('signal form field rules', () => {
  let injector: Injector;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
  });

  it('marks empty required email as invalid and accepts a Yemen address', () => {
    const loginForm = runInInjectionContext(injector, () =>
      form(signal({ email: '', password: '' }), (p) => {
        required(p.email);
        email(p.email);
        applyPasswordRules(p.password);
      }),
    );

    expect(loginForm.email().invalid()).toBe(true);
    expect(loginForm.email().errors()[0]?.kind).toBe('required');

    loginForm.email().value.set('not-an-email');
    expect(loginForm.email().errors()[0]?.kind).toBe('email');

    loginForm.email().value.set('admin@aggregator.ye');
    expect(loginForm.email().valid()).toBe(true);
  });

  it('requires eight characters with letters and numbers', () => {
    const resetForm = runInInjectionContext(injector, () =>
      form(signal({ password: '' }), (p) => applyPasswordRules(p.password)),
    );

    resetForm.password().value.set('short');
    expect(resetForm.password().errors().some((err) => err.kind === 'minLength')).toBe(true);

    resetForm.password().value.set('abcdefgh');
    expect(resetForm.password().errors().some((err) => err.kind === 'passwordStrength')).toBe(true);

    resetForm.password().value.set('Agg12345!');
    expect(resetForm.password().valid()).toBe(true);
  });

  it('requires a phone number with at least seven digits', () => {
    const signup = runInInjectionContext(injector, () =>
      form(signal({ phone: '' }), (p) => applyPhoneRules(p.phone)),
    );
    expect(signup.phone().errors()[0]?.kind).toBe('required');

    signup.phone().value.set('123');
    expect(signup.phone().errors()[0]?.kind).toBe('phone');

    signup.phone().value.set('+967 777 110 001');
    expect(signup.phone().valid()).toBe(true);
  });

  it('exposes minLength on the password field metadata', () => {
    const loginForm = runInInjectionContext(injector, () =>
      form(signal({ password: '' }), (p) => minLength(p.password, 8)),
    );
    expect(loginForm.password().minLength?.()).toBe(8);
  });
});
