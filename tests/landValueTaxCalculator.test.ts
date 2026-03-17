import { describe, expect, it } from 'vitest';
import { calculateLandValueTax } from '../src/main/calculators/landValueTaxCalculator';

describe('C-15 land value tax calculator', () => {
  it('applies 1% within the first PS*4 bracket', () => {
    const result = calculateLandValueTax({
      assessedValue: 2_000,
      psUnit: 1_000
    });

    expect(result.tax).toBe(20);
    expect(result.steps[0]).toMatchObject({
      rate: 0.01,
      taxable: 2_000
    });
  });

  it('charges 5PS width for the second bracket (rate 1.5%)', () => {
    const result = calculateLandValueTax({
      assessedValue: 6_000,
      psUnit: 1_000
    });

    expect(result.steps[0].taxable).toBe(4_000);
    expect(result.steps[1]).toMatchObject({
      rate: 0.015,
      taxable: 2_000
    });
    expect(result.tax).toBe(70);
  });

  it('uses 0.2% rate for self-use residential land', () => {
    const result = calculateLandValueTax({
      assessedValue: 10_000,
      psUnit: 1_000,
      selfUse: true
    });

    expect(result.tax).toBe(20);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      rate: 0.002,
      taxable: 10_000
    });
  });
});
