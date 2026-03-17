import type Database from 'better-sqlite3';
import type {
  IitCalculationInput,
  IitDeductionResult,
  IitDividendMethodResult
} from '../../shared/ipc-types';
import { calculateIndividualAmt } from './amtCalculator';
import { getYearlyParamMap } from '../services/yearlyParamsService';

type IitBracket = {
  ceil: number;
  rate: number;
  diff: number;
};

function shouldExcludeLongTermCare(testTaxRate: number): boolean {
  return testTaxRate >= 0.2;
}

export function buildIitBrackets(limits: number[]): IitBracket[] {
  const rates = [0.05, 0.12, 0.2, 0.3, 0.4];
  const brackets: IitBracket[] = [];
  let cumulativeTaxBelow = 0;
  let lowerBound = 0;

  for (let index = 0; index < rates.length; index += 1) {
    const ceil = limits[index] ?? Number.POSITIVE_INFINITY;
    const rate = rates[index];
    const diff = lowerBound * rate - cumulativeTaxBelow;

    brackets.push({ ceil, rate, diff });

    if (Number.isFinite(ceil)) {
      cumulativeTaxBelow += (ceil - lowerBound) * rate;
      lowerBound = ceil;
    }
  }

  return brackets;
}

function calculateProgressiveTax(netIncome: number, limits: number[]): number {
  const brackets = buildIitBrackets(limits);
  const bracket = brackets.find((candidate) => netIncome <= candidate.ceil) ?? brackets[brackets.length - 1];
  return Math.max(0, Math.round(netIncome * bracket.rate - bracket.diff));
}

function calculateDividendMethodA(
  salaryNetIncome: number,
  dividendIncome: number,
  withholdingCredit: number,
  bracketLimits: number[]
): IitDividendMethodResult {
  const taxableNetIncome = Math.max(0, Math.round(salaryNetIncome + dividendIncome));
  const progressiveTax = calculateProgressiveTax(taxableNetIncome, bracketLimits);
  const dividendCredit = Math.min(Math.round(dividendIncome * 0.085), 80000);
  const regularTax = Math.max(0, progressiveTax - dividendCredit - withholdingCredit);

  return {
    taxableNetIncome,
    progressiveTax,
    dividendCredit,
    withholdingCredit,
    regularTax,
    dividendFlatTax: 0,
    totalTax: regularTax
  };
}

function calculateDividendMethodB(
  salaryNetIncome: number,
  dividendIncome: number,
  withholdingCredit: number,
  bracketLimits: number[]
): IitDividendMethodResult {
  const taxableNetIncome = Math.max(0, Math.round(salaryNetIncome));
  const progressiveTax = calculateProgressiveTax(taxableNetIncome, bracketLimits);
  const regularTax = Math.max(0, progressiveTax - withholdingCredit);
  const dividendFlatTax = Math.round(dividendIncome * 0.28);

  return {
    taxableNetIncome,
    progressiveTax,
    dividendCredit: 0,
    withholdingCredit,
    regularTax,
    dividendFlatTax,
    totalTax: regularTax + dividendFlatTax
  };
}

export function calculateIitDeductions(
  db: Database.Database,
  input: IitCalculationInput
): IitDeductionResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'TAX_IIT',
    usageContext: 'income_year'
  });

  const preschoolAgeCap = Number(params.preschool_age_cap ?? 6);
  const preschoolFirst = Number(params.special_preschool_first ?? 0);
  const preschoolSecondPlus = Number(params.special_preschool_second_plus ?? 0);
  const preschoolHasExclusion = Number(params.preschool_has_exclusion ?? 0);
  const longTermCareAmount = Number(params.special_longterm_care ?? 0);
  const exemptionGeneral = Number(params.exemption_general ?? 0);
  const standardDeductionSingle = Number(params.std_deduction_single ?? 0);
  const standardDeductionMarried = Number(params.std_deduction_married ?? standardDeductionSingle);
  const specialSalary = Number(params.special_salary ?? 0);
  const basicLivingExpense = Number(params.basic_living_expense ?? 0);
  const bracketLimits = [
    Number(params.bracket_1_limit ?? 0),
    Number(params.bracket_2_limit ?? 0),
    Number(params.bracket_3_limit ?? 0),
    Number(params.bracket_4_limit ?? 0)
  ];

  const preschoolEligibleChildren = input.children
    .filter((child) => child.age <= preschoolAgeCap)
    .sort((left, right) => left.birthOrderAmongChildren - right.birthOrderAmongChildren)
    .map((child) => ({
      id: child.id,
      birthOrderAmongChildren: child.birthOrderAmongChildren,
      deduction: child.birthOrderAmongChildren === 1 ? preschoolFirst : preschoolSecondPlus
    }));

  const preschoolDeductionBase = preschoolEligibleChildren.reduce(
    (sum, child) => sum + child.deduction,
    0
  );

  const preschoolDeduction =
    preschoolHasExclusion === 1 && shouldExcludeLongTermCare(input.testTaxRate)
      ? 0
      : preschoolDeductionBase;

  const longTermCareExcluded =
    input.applyLongTermCareDeduction && shouldExcludeLongTermCare(input.testTaxRate);
  const longTermCareDeduction =
    input.applyLongTermCareDeduction && !longTermCareExcluded ? longTermCareAmount : 0;

  const exemptionTotal = exemptionGeneral * (input.exemptionCount ?? 0);
  const standardDeduction =
    (input.filingStatus ?? 'single') === 'married'
      ? standardDeductionMarried
      : standardDeductionSingle;
  const salaryDeduction = (input.salaryIncome ?? 0) > 0 ? specialSalary : 0;
  const totalDeductionsBeforeBasicLiving =
    standardDeduction + salaryDeduction + preschoolDeduction + longTermCareDeduction;
  const basicLivingExpenseDifference = Math.max(
    0,
    basicLivingExpense * (input.householdSize ?? 0) -
      (exemptionTotal + totalDeductionsBeforeBasicLiving)
  );
  const taxableNetIncome = Math.max(
    0,
    (input.salaryIncome ?? 0) -
      exemptionTotal -
      totalDeductionsBeforeBasicLiving -
      basicLivingExpenseDifference
  );
  const progressiveTax = calculateProgressiveTax(taxableNetIncome, bracketLimits);
  const dividendIncome = Math.max(0, Math.round(input.dividendIncome ?? 0));
  const withholdingCredit = Math.max(0, Math.round(input.withholdingCredit ?? 0));
  const dividendMethodA = calculateDividendMethodA(
    taxableNetIncome,
    dividendIncome,
    withholdingCredit,
    bracketLimits
  );
  const dividendMethodB = calculateDividendMethodB(
    taxableNetIncome,
    dividendIncome,
    withholdingCredit,
    bracketLimits
  );
  const recommendedDividendMethod =
    dividendMethodA.totalTax <= dividendMethodB.totalTax ? 'A' : 'B';
  const selectedDividendMethod = recommendedDividendMethod;
  const selectedMethod =
    selectedDividendMethod === 'A' ? dividendMethodA : dividendMethodB;
  const amt = calculateIndividualAmt(db, {
    fiscalYear: input.fiscalYear,
    regularTax: Math.max(0, selectedMethod.regularTax),
    netIncome: taxableNetIncome,
    overseasIncome: input.overseasIncome ?? 0,
    insuranceDeathBenefit: input.insuranceDeathBenefit ?? 0,
    insuranceNonDeath: input.insuranceNonDeath ?? 0,
    privateFundGain: input.privateFundGain ?? 0,
    nonCashDonation: input.nonCashDonation ?? 0,
    foreignTaxPaid: input.foreignTaxPaid ?? 0
  });

  return {
    fiscalYear: input.fiscalYear,
    preschoolDeduction,
    preschoolEligibleChildren,
    longTermCareDeduction,
    longTermCareExcluded,
    exemptionTotal,
    standardDeduction,
    salaryDeduction,
    basicLivingExpenseDifference,
    taxableNetIncome,
    progressiveTax,
    dividendIncome,
    withholdingCredit,
    dividendMethodA,
    dividendMethodB,
    recommendedDividendMethod,
    selectedDividendMethod,
    regularTax: selectedMethod.regularTax,
    amt
  };
}
