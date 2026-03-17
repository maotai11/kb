import type {
  HouseLandTaxCalculationInput,
  HouseLandTaxCalculationResult
} from '../../shared/ipc-types';

function roundAmount(value: number): number {
  return Math.round(value);
}

function parseDate(dateText: string): Date {
  const [yearText, monthText, dayText] = dateText.split('-');
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addYearsPreservingEndOfMonth(date: Date, years: number): Date {
  const year = date.getFullYear() + years;
  const month = date.getMonth();
  const day = date.getDate();
  const candidate = new Date(year, month, day);

  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }

  return candidate;
}

function getHoldStartDate(input: HouseLandTaxCalculationInput): Date {
  switch (input.acquisitionMethod) {
    case 'self_built': {
      if (!input.landAcquisitionDate || !input.usageLicenseDate) {
        throw new Error('self_built requires landAcquisitionDate and usageLicenseDate');
      }
      const landDate = parseDate(input.landAcquisitionDate);
      const licenseDate = parseDate(input.usageLicenseDate);
      return new Date(Math.max(landDate.getTime(), licenseDate.getTime()));
    }
    case 'purchase':
    case 'presale':
    case 'inheritance':
    case 'gift':
      if (!input.acquisitionDate) {
        throw new Error(`${input.acquisitionMethod} requires acquisitionDate`);
      }
      return parseDate(input.acquisitionDate);
  }
}

function getHoldDuration(startDate: Date, saleDate: Date): { years: number; months: number } {
  let years = saleDate.getFullYear() - startDate.getFullYear();
  let months = saleDate.getMonth() - startDate.getMonth();

  if (saleDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months)
  };
}

function getRate(
  holdYears: number,
  holdMonths: number,
  selfUseEligible: boolean
): { rate: number; selfUseApplied: boolean } {
  if (selfUseEligible) {
    return { rate: 0.1, selfUseApplied: true };
  }

  if (holdYears < 2 || (holdYears === 2 && holdMonths === 0)) {
    return { rate: 0.45, selfUseApplied: false };
  }

  if (holdYears < 5 || (holdYears === 5 && holdMonths === 0)) {
    return { rate: 0.35, selfUseApplied: false };
  }

  if (holdYears < 10 || (holdYears === 10 && holdMonths === 0)) {
    return { rate: 0.2, selfUseApplied: false };
  }

  return { rate: 0.15, selfUseApplied: false };
}

export function calculateHouseLandTax(
  input: HouseLandTaxCalculationInput
): HouseLandTaxCalculationResult {
  const holdStartDate = getHoldStartDate(input);
  const saleDate = parseDate(input.saleDate);
  const { years: holdYears, months: holdMonths } = getHoldDuration(holdStartDate, saleDate);
  const { rate, selfUseApplied } = getRate(holdYears, holdMonths, input.selfUseEligible === true);

  const profitAmount = Math.max(0, roundAmount(input.profitAmount));
  const taxableGain = Math.max(0, selfUseApplied ? profitAmount - 4_000_000 : profitAmount);
  const taxPayable = roundAmount(taxableGain * rate);

  let deadline: string | null = null;
  let withinTwoYears = false;
  let refundType: HouseLandTaxCalculationResult['repurchase']['refundType'] = 'none';
  let refundAmount = 0;

  if (input.replacementPurchaseDate) {
    const replacementPurchaseDate = parseDate(input.replacementPurchaseDate);
    const deadlineDate = addYearsPreservingEndOfMonth(saleDate, 2);
    deadline = formatDate(deadlineDate);
    withinTwoYears = replacementPurchaseDate.getTime() <= deadlineDate.getTime();

    if (withinTwoYears && input.oldSalePrice && input.newPurchasePrice) {
      if (input.newPurchasePrice >= input.oldSalePrice) {
        refundType = 'full';
        refundAmount = taxPayable;
      } else {
        refundType = 'partial';
        refundAmount = roundAmount(taxPayable * (input.newPurchasePrice / input.oldSalePrice));
      }
    }
  }

  return {
    acquisitionMethod: input.acquisitionMethod,
    holdStartDate: formatDate(holdStartDate),
    saleDate: formatDate(saleDate),
    holdYears,
    holdMonths,
    rate,
    taxableGain,
    taxPayable,
    selfUseApplied,
    repurchase: {
      deadline,
      withinTwoYears,
      refundType,
      refundAmount
    }
  };
}
