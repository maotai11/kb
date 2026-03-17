import type Database from 'better-sqlite3';
import type {
  WithholdingCalculationInput,
  WithholdingCalculationResult
} from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculateWithholding(
  db: Database.Database,
  input: WithholdingCalculationInput
): WithholdingCalculationResult {
  if (input.incomeType === 'rent' && input.landlordType === 'corporation') {
    return {
      fiscalYear: input.fiscalYear,
      incomeType: input.incomeType,
      withholding: 0,
      taxRate: 0,
      note: '法人免扣繳'
    };
  }

  if (input.recipientResidency === 'nonresident') {
    const params = getYearlyParamMap(db, {
      fiscalYear: input.fiscalYear,
      category: 'WITHHOLD_NRA',
      usageContext: 'effective_year'
    });

    const salaryThreshold = Number(params.nra_salary_threshold ?? 0);
    const salaryRateLow = Number(params.nra_salary_rate_low ?? 0.06);
    const salaryRateHigh = Number(params.nra_salary_rate_high ?? 0.18);
    const otherRate = Number(params.nra_other_rate ?? 0.2);
    const dividendRate = Number(params.nra_dividend_rate ?? 0.21);
    const shortTermInterestRate = Number(params.nra_interest_short_term_rate ?? 0.15);

    let taxRate = otherRate;
    let note = '非居住者一般扣繳';

    switch (input.incomeType) {
      case 'salary':
        taxRate = input.amount <= salaryThreshold ? salaryRateLow : salaryRateHigh;
        note = `非居住者薪資，按 ${Math.round(taxRate * 100)}% 計算`;
        break;
      case 'dividend':
        taxRate = dividendRate;
        note = '非居住者股利扣繳';
        break;
      case 'interest':
        taxRate = shortTermInterestRate;
        note = '非居住者短期票券利息扣繳';
        break;
      case 'service_fee':
      case 'rent':
      case 'other':
        taxRate = otherRate;
        note = '非居住者一般 20% 扣繳';
        break;
      default:
        taxRate = otherRate;
    }

    return {
      fiscalYear: input.fiscalYear,
      incomeType: input.incomeType,
      withholding: roundCurrency(input.amount * taxRate),
      taxRate,
      note
    };
  }

  return {
    fiscalYear: input.fiscalYear,
    incomeType: input.incomeType,
    withholding: 0,
    taxRate: 0,
    note: '居住者扣繳規則尚未納入本批實作'
  };
}
