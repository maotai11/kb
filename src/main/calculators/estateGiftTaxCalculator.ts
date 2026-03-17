import type Database from 'better-sqlite3';
import type {
  EstateGiftTaxCalculationInput,
  EstateGiftTaxCalculationResult
} from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

const BRACKET_CUTOFF = new Date('2025-01-01');

function roundCurrency(value: number): number {
  return Math.round(value);
}

function getLookupYear(eventDate: Date): 113 | 114 {
  return eventDate >= BRACKET_CUTOFF ? 114 : 113;
}

function getCategory(taxType: EstateGiftTaxCalculationInput['taxType']): string {
  return taxType === 'estate' ? 'TAX_ESTATE_BRACKET' : 'TAX_GIFT_BRACKET';
}

export function calculateEstateGiftTax(
  db: Database.Database,
  input: EstateGiftTaxCalculationInput
): EstateGiftTaxCalculationResult {
  const eventDate = new Date(input.eventDate);
  const lookupYear = getLookupYear(eventDate);
  const params = getYearlyParamMap(db, {
    fiscalYear: lookupYear,
    category: getCategory(input.taxType),
    usageContext: 'income_year'
  });

  const tier1 = Number(params.tier1_ceil ?? 0);
  const tier2 = Number(params.tier2_ceil ?? 0);
  const tier1Rate = Number(params.tier1_rate ?? 0.1);
  const tier2Rate = Number(params.tier2_rate ?? 0.15);
  const tier3Rate = Number(params.tier3_rate ?? 0.2);
  const tier2Diff = Number(params.tier2_diff ?? 0);
  const tier3Diff = Number(params.tier3_diff ?? 0);
  const netTaxableAmount = Math.max(0, roundCurrency(input.netTaxableAmount));

  let rate = tier1Rate;
  let progressiveDifference = 0;
  let bracketLabel: EstateGiftTaxCalculationResult['bracketLabel'] = 'tier1';

  if (netTaxableAmount > tier2) {
    rate = tier3Rate;
    progressiveDifference = tier3Diff;
    bracketLabel = 'tier3';
  } else if (netTaxableAmount > tier1) {
    rate = tier2Rate;
    progressiveDifference = tier2Diff;
    bracketLabel = 'tier2';
  }

  return {
    taxType: input.taxType,
    eventDate: input.eventDate,
    lookupYear,
    netTaxableAmount,
    rate,
    progressiveDifference,
    taxPayable: Math.max(0, roundCurrency(netTaxableAmount * rate - progressiveDifference)),
    bracketLabel,
    bracketCeilings: {
      tier1,
      tier2
    }
  };
}
