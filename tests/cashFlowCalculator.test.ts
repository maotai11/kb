import { describe, expect, it } from 'vitest';
import {
  calculateUndistributedEarningsTax,
  calculateRentalWithholding
} from '../src/main/calculators/cashFlowCalculators';

describe('C-3-B undistributed earnings tax', () => {
  it('applies 5% on earnings and returns filing info in income_year usage context', () => {
    const fiscalYear = 115;
    const result = calculateUndistributedEarningsTax({
      fiscalYear,
      earnings: 1_000_000
    });

    expect(result.undistributedTax).toBe(50_000);
    expect(result.filingYear).toBe(fiscalYear + 1);
    expect(result.filingDeadline).toBe('116/05/01 ~ 116/05/31');
  });
});

describe('C-4 rental withholding calculator', () => {
  it('skips withholding for corporate landlords', () => {
    const result = calculateRentalWithholding({
      netDesired: 30_000,
      landlordType: 'corporation',
      payerType: 'individual'
    });

    expect(result.withholding).toBe(0);
    expect(result.note).toContain('法人房東');
  });

  it('returns zero when gross < 20,000 threshold', () => {
    const result = calculateRentalWithholding({
      netDesired: 15_000,
      landlordType: 'individual',
      payerType: 'individual'
    });

    expect(result.withholding).toBe(0);
    expect(result.note).toContain('未達起扣金額');
  });

  it('calculates tax and NHI when gross >= 20,000', () => {
    const result = calculateRentalWithholding({
      netDesired: 20_000,
      landlordType: 'individual',
      payerType: 'individual'
    });

    expect(result.withholding).toBeCloseTo(20_000 / (1 - 0.10 - 0.0211) * 0.10, 0);
    expect(result.nhi).toBeCloseTo(20_000 / (1 - 0.10 - 0.0211) * 0.0211, 0);
    expect(result.note).toBeUndefined();
  });
});
