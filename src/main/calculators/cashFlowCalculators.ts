export interface UndistributedEarningsInput {
  fiscalYear: number;
  earnings: number;
}

export interface UndistributedEarningsResult {
  undistributedTax: number;
  filingYear: number;
  filingDeadline: string;
}

export interface RentalWithholdingInput {
  netDesired: number;
  landlordType: 'individual' | 'corporation';
  payerType: 'individual' | 'corporation';
}

export interface RentalWithholdingResult {
  withholding: number;
  gross?: number;
  nhi?: number;
  note?: string;
}

export function calculateUndistributedEarningsTax(
  input: UndistributedEarningsInput
): UndistributedEarningsResult {
  const { fiscalYear, earnings } = input;
  const filingYear = fiscalYear + 1;
  return {
    undistributedTax: earnings * 0.05,
    filingYear,
    filingDeadline: `${filingYear}/05/01 ~ ${filingYear}/05/31`,
  };
}

export function calculateRentalWithholding(
  input: RentalWithholdingInput
): RentalWithholdingResult {
  const { netDesired, landlordType, payerType } = input;

  if (landlordType === 'corporation') {
    return { withholding: 0, note: '法人房東免扣繳' };
  }

  // 補充保費由扣費義務人（給付人）代扣；個人付款人無扣費義務
  const nhiRate = payerType === 'corporation' ? 0.0211 : 0;
  const gross = netDesired / (1 - 0.10 - nhiRate);

  if (gross < 20_000) {
    return { withholding: 0, gross, note: `未達起扣金額 20,000（毛額 ${gross.toFixed(0)} 元）` };
  }

  return {
    gross,
    withholding: gross * 0.10,
    nhi: nhiRate > 0 ? gross * nhiRate : undefined,
    note: nhiRate === 0 ? '個人付款人不代扣補充保費' : undefined,
  };
}
