import { describe, expect, it } from 'vitest';
import { calculateHouseTax } from '../src/main/calculators/houseTaxCalculator';

describe('C house-tax calculator', () => {
  it('applies 1.2% for self-use residential', () => {
    const result = calculateHouseTax({ houseValue: 1_000_000, usageType: 'self_use' });
    expect(result.tax).toBeCloseTo(12_000, 0);
    expect(result.rate).toBe(0.012);
  });

  it('applies 2.4% for non-self-use residential', () => {
    const result = calculateHouseTax({ houseValue: 1_000_000, usageType: 'non_self_use' });
    expect(result.tax).toBeCloseTo(24_000, 0);
  });

  it('applies 3% for business use', () => {
    const result = calculateHouseTax({ houseValue: 1_000_000, usageType: 'business' });
    expect(result.tax).toBeCloseTo(30_000, 0);
  });

  it('applies 2% for other non-residential use', () => {
    const result = calculateHouseTax({ houseValue: 1_000_000, usageType: 'other_non_residential' });
    expect(result.tax).toBeCloseTo(20_000, 0);
  });
});
