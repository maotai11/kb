import type {
  LandValueTaxInput,
  LandValueTaxResult,
  LandValueTaxStep
} from '../../shared/ipc-types';

const bracketLimits = [4, 9, 14, 19, 24, Number.POSITIVE_INFINITY];
const bracketRates = [0.01, 0.015, 0.025, 0.035, 0.045, 0.055];

function buildStep(taxable: number, rate: number): LandValueTaxStep {
  return {
    taxable,
    rate,
    taxAmount: taxable * rate
  };
}

export function calculateLandValueTax(input: LandValueTaxInput): LandValueTaxResult {
  const { assessedValue, psUnit, selfUse = false } = input;
  if (assessedValue <= 0 || psUnit <= 0) {
    return {
      assessedValue,
      psUnit,
      tax: 0,
      steps: []
    };
  }

  if (selfUse) {
    const tax = assessedValue * 0.002;
    return {
      assessedValue,
      psUnit,
      tax,
      steps: [buildStep(assessedValue, 0.002)]
    };
  }

  const steps: LandValueTaxStep[] = [];
  let lastLimit = 0;
  let tax = 0;

  for (let index = 0; index < bracketLimits.length; index += 1) {
    const limitFactor = bracketLimits[index];
    const rate = bracketRates[index];
    const bracketMax = Number.isFinite(limitFactor) ? limitFactor * psUnit : Number.POSITIVE_INFINITY;
    const taxable = Math.max(0, Math.min(assessedValue, bracketMax) - lastLimit);

    if (taxable > 0) {
      steps.push(buildStep(taxable, rate));
      tax += taxable * rate;
    }

    lastLimit = bracketMax;

    if (lastLimit >= assessedValue) {
      break;
    }
  }

  return {
    assessedValue,
    psUnit,
    tax,
    steps
  };
}
