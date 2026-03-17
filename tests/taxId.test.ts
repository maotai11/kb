import { describe, expect, it } from 'vitest';
import { validateTaxId } from '../src/shared/taxId';

describe('validateTaxId', () => {
  it('accepts a valid tax id', () => {
    expect(validateTaxId('22099131')).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(validateTaxId('1234567')).toBe(false);
    expect(validateTaxId('ABCDEFGH')).toBe(false);
  });

  it('supports the seventh-digit special rule', () => {
    expect(validateTaxId('24536806')).toBe(true);
  });
});
