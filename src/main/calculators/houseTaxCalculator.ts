import type {
  HouseTaxCalculationInput,
  HouseTaxCalculationResult,
  HouseTaxUsageType
} from '../../shared/ipc-types';

const DEFAULT_RATES: Record<HouseTaxUsageType, number> = {
  self_use: 0.012,
  non_self_use: 0.024,
  business: 0.03,
  other_non_residential: 0.02
};

export function calculateHouseTax(input: HouseTaxCalculationInput): HouseTaxCalculationResult {
  const rate = input.rate ?? DEFAULT_RATES[input.usageType];
  const tax = input.houseValue * rate;

  return {
    houseValue: input.houseValue,
    usageType: input.usageType,
    rate,
    tax
  };
}
