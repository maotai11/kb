import type Database from 'better-sqlite3';
import type {
  RetirementCalculationInput,
  RetirementCalculationResult
} from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculateRetirementIncome(
  db: Database.Database,
  input: RetirementCalculationInput
): RetirementCalculationResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'TAX_IIT',
    usageContext: 'income_year'
  });

  const totalAmount = Math.max(0, roundCurrency(input.totalAmount));
  const yearsOfService = Math.max(0, roundCurrency(input.yearsOfService));

  if (input.paymentType === 'annuity') {
    const annualExemptRaw = params.retirement_annuity_annual;
    if (annualExemptRaw == null) {
      return {
        fiscalYear: input.fiscalYear,
        paymentType: input.paymentType,
        yearsOfService,
        totalAmount,
        annualExempt: null,
        tier1Amount: null,
        tier2Amount: null,
        taxableAmount: null,
        appliedTier: null,
        error: '115年度分期退職定額免稅額尚未公告，請選擇一次領或改用114年試算'
      };
    }

    const annualExempt = Number(annualExemptRaw);
    const taxableAmount = Math.max(0, totalAmount - annualExempt);

    return {
      fiscalYear: input.fiscalYear,
      paymentType: input.paymentType,
      yearsOfService,
      totalAmount,
      annualExempt,
      tier1Amount: annualExempt,
      tier2Amount: annualExempt,
      taxableAmount,
      appliedTier: 'annuity',
      error: null
    };
  }

  const annualExempt = Number(params.retirement_lump_annual ?? 0);
  const tier1Amount = roundCurrency(yearsOfService * annualExempt);
  const tier2Amount = roundCurrency(tier1Amount * 2);

  let taxableAmount = 0;
  let appliedTier: RetirementCalculationResult['appliedTier'] = 'tier1';

  if (totalAmount <= tier1Amount) {
    taxableAmount = 0;
    appliedTier = 'tier1';
  } else if (totalAmount <= tier2Amount) {
    taxableAmount = roundCurrency((totalAmount - tier1Amount) * 0.5);
    appliedTier = 'tier2';
  } else {
    taxableAmount = roundCurrency((tier1Amount * 0.5) + (totalAmount - tier2Amount));
    appliedTier = 'tier3';
  }

  return {
    fiscalYear: input.fiscalYear,
    paymentType: input.paymentType,
    yearsOfService,
    totalAmount,
    annualExempt,
    tier1Amount,
    tier2Amount,
    taxableAmount,
    appliedTier,
    error: null
  };
}
