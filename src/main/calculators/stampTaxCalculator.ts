import type { StampTaxCalculationInput, StampTaxCalculationResult } from '../../shared/ipc-types';

const stampRateMap: Record<
  StampTaxCalculationInput['certificateType'],
  { label: string; ratePerThousand: number }
> = {
  cashReceipt: { label: '銀錢收據', ratePerThousand: 0.4 },
  contract: { label: '承攬契約', ratePerThousand: 0.1 },
  realEstate: { label: '典賣/讓受不動產契約', ratePerThousand: 1 },
  loan: { label: '消費借貸契約', ratePerThousand: 0.4 }
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateStampTax(
  input: StampTaxCalculationInput
): StampTaxCalculationResult {
  const meta = stampRateMap[input.certificateType];
  const rateDecimal = meta.ratePerThousand / 1000;
  const tax = roundToCents(input.amount * rateDecimal);

  return {
    certificateType: input.certificateType,
    certificateLabel: meta.label,
    amount: input.amount,
    ratePerThousand: meta.ratePerThousand,
    rateDecimal,
    tax
  };
}
