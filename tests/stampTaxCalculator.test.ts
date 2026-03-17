import { describe, expect, it } from 'vitest';
import { calculateStampTax } from '../src/main/calculators/stampTaxCalculator';

describe('stamp tax calculator', () => {
  it.each([
    ['cashReceipt', '銀錢收據', 0.4],
    ['contract', '承攬契約', 0.1],
    ['realEstate', '典賣/讓受不動產契約', 1],
    ['loan', '消費借貸契約', 0.4]
  ] as const)('applies %s rate', (type, label, ratePerThousand) => {
    const amount = 500_000;
    const result = calculateStampTax({ certificateType: type, amount });

    expect(result.certificateType).toBe(type);
    expect(result.certificateLabel).toBe(label);
    expect(result.ratePerThousand).toBe(ratePerThousand);
    expect(result.rateDecimal).toBe(ratePerThousand / 1000);
    expect(result.tax).toBe(Math.round(amount * (ratePerThousand / 1000) * 100) / 100);
  });

  it('rounds tax to two decimals', () => {
    const result = calculateStampTax({
      certificateType: 'contract',
      amount: 1234
    });

    expect(result.tax).toBe(Math.round(1234 * 0.0001 * 100) / 100);
  });
});
