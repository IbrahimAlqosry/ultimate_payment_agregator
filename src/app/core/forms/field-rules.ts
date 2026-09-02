import { SchemaPath, minLength, required, validate } from '@angular/forms/signals';

const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;

export function applyPasswordRules(path: SchemaPath<string>): void {
  required(path);
  minLength(path, 8);
  validate(path, ({ value }) => {
    const next = value();
    if (!next) {
      return undefined;
    }
    if (!HAS_LETTER.test(next) || !HAS_DIGIT.test(next)) {
      return { kind: 'passwordStrength' };
    }
    return undefined;
  });
}

export function applyPhoneRules(path: SchemaPath<string>): void {
  required(path);
  validate(path, ({ value }) => {
    const digits = value().replace(/\D/g, '');
    if (!digits) {
      return undefined;
    }
    return digits.length < 7 ? { kind: 'phone' } : undefined;
  });
}
