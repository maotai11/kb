import type Database from 'better-sqlite3';
import type {
  NhiSupplementCalculationInput,
  NhiSupplementCalculationResult
} from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

const MAX_TAXABLE_AMOUNT = 10_000_000;

function roundAmount(value: number): number {
  return Math.round(value);
}

export function calculateNhiSupplementPremium(
  db: Database.Database,
  input: NhiSupplementCalculationInput
): NhiSupplementCalculationResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'LABOR',
    usageContext: 'effective_year'
  });

  const rate = Number(params.nhi_supplement_rate ?? 0.0211);
  const threshold = roundAmount(Math.max(0, input.insuredSalary) * 4);
  const currentBonus = roundAmount(Math.max(0, input.currentBonus));
  const ytdBonusPaid = roundAmount(Math.max(0, input.ytdBonusPaid));
  const ytdTotalBonus = ytdBonusPaid + currentBonus;

  let taxableAmount = 0;
  if (ytdTotalBonus <= threshold) {
    taxableAmount = 0;
  } else if (ytdBonusPaid >= threshold) {
    taxableAmount = currentBonus;
  } else {
    taxableAmount = ytdTotalBonus - threshold;
  }

  const cappedTaxableAmount = Math.min(taxableAmount, MAX_TAXABLE_AMOUNT);

  return {
    fiscalYear: input.fiscalYear,
    rate,
    threshold,
    thresholdReached: ytdTotalBonus > threshold,
    ytdTotalBonus,
    taxableAmount,
    cappedTaxableAmount,
    supplementPremium: roundAmount(cappedTaxableAmount * rate)
  };
}
