import type Database from 'better-sqlite3';
import type { CitCalculationInput, CitCalculationResult } from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculateCit(
  db: Database.Database,
  input: CitCalculationInput
): CitCalculationResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'TAX_CIT',
    usageContext: 'income_year'
  });

  const exemptionThreshold = Number(params.cit_exemption_threshold ?? 120000);
  const taxRate = Number(params.cit_rate ?? 0.2);
  const taxableIncome = Math.max(0, roundCurrency(input.taxableIncome));

  if (taxableIncome <= exemptionThreshold) {
    return {
      fiscalYear: input.fiscalYear,
      taxableIncome,
      exemptionThreshold,
      taxRate,
      normalTax: 0,
      excessHalfTax: 0,
      taxPayable: 0,
      appliedRule: 'exempt'
    };
  }

  const normalTax = roundCurrency(taxableIncome * taxRate);
  const excessHalfTax = roundCurrency((taxableIncome - exemptionThreshold) * 0.5);
  const taxPayable = Math.min(normalTax, excessHalfTax);
  const appliedRule = normalTax < excessHalfTax ? 'normal' : normalTax > excessHalfTax ? 'smooth' : 'normal';

  return {
    fiscalYear: input.fiscalYear,
    taxableIncome,
    exemptionThreshold,
    taxRate,
    normalTax,
    excessHalfTax,
    taxPayable,
    appliedRule
  };
}
