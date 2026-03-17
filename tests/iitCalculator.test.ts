import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';
import { buildIitBrackets, calculateIitDeductions } from '../src/main/calculators/iitCalculator';
import type { IitCalculationInput } from '../src/shared/ipc-types';

describe('C-1 IIT calculator baseline', () => {
  it('reads TAX_IIT params using income_year instead of effective_year', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const params = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_IIT',
      usageContext: 'income_year'
    });

    expect(params.exemption_general).toBe(101000);
    expect(params.special_longterm_care).toBe(180000);
    expect(params.preschool_has_exclusion).toBe(0);

    const wrongContext = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_IIT',
      usageContext: 'effective_year'
    });

    expect(wrongContext).toEqual({});
  });

  it('keeps preschool deduction birth order based on all children, not only age-eligible children', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const input: IitCalculationInput = {
      fiscalYear: 115,
      children: [
        { id: 'c1', age: 8, birthOrderAmongChildren: 1 },
        { id: 'c2', age: 4, birthOrderAmongChildren: 2 },
        { id: 'c3', age: 2, birthOrderAmongChildren: 3 }
      ],
      applyLongTermCareDeduction: false,
      testNetIncome: 0,
      testTaxRate: 0.05
    };

    const result = calculateIitDeductions(db, input);

    expect(result.preschoolEligibleChildren).toHaveLength(2);
    expect(result.preschoolEligibleChildren).toEqual([
      { id: 'c2', deduction: 225000, birthOrderAmongChildren: 2 },
      { id: 'c3', deduction: 225000, birthOrderAmongChildren: 3 }
    ]);
    expect(result.preschoolDeduction).toBe(450000);
  });

  it('applies exclusion to long-term care but never to preschool deduction after 113', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const input: IitCalculationInput = {
      fiscalYear: 115,
      children: [{ id: 'c1', age: 3, birthOrderAmongChildren: 1 }],
      applyLongTermCareDeduction: true,
      testNetIncome: 3000000,
      testTaxRate: 0.2
    };

    const result = calculateIitDeductions(db, input);

    expect(result.preschoolDeduction).toBe(150000);
    expect(result.longTermCareDeduction).toBe(0);
    expect(result.longTermCareExcluded).toBe(true);
  });

  it('builds five progressive brackets from dynamic limits instead of hardcoded cumulative diffs', () => {
    const brackets = buildIitBrackets([500000, 1000000, 2000000, 4000000]);

    expect(brackets).toEqual([
      { ceil: 500000, rate: 0.05, diff: 0 },
      { ceil: 1000000, rate: 0.12, diff: 35000 },
      { ceil: 2000000, rate: 0.2, diff: 115000 },
      { ceil: 4000000, rate: 0.3, diff: 315000 },
      { ceil: Number.POSITIVE_INFINITY, rate: 0.4, diff: 715000 }
    ]);
  });

  it('calculates basic living expense difference after exemptions and deductions, and only when positive', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIitDeductions(db, {
      fiscalYear: 115,
      children: [],
      applyLongTermCareDeduction: false,
      testNetIncome: 0,
      testTaxRate: 0.05,
      salaryIncome: 1_000_000,
      householdSize: 4,
      exemptionCount: 4,
      filingStatus: 'single'
    });

    expect(result.exemptionTotal).toBe(404000);
    expect(result.standardDeduction).toBe(136000);
    expect(result.salaryDeduction).toBe(227000);
    expect(result.basicLivingExpenseDifference).toBe(85000);
    expect(result.taxableNetIncome).toBe(148000);
    expect(result.progressiveTax).toBe(7400);
  });

  it('caps dividend credit at 80,000 per household under method A and recommends the lower total tax method', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIitDeductions(db, {
      fiscalYear: 115,
      children: [],
      applyLongTermCareDeduction: false,
      testNetIncome: 0,
      testTaxRate: 0.3,
      salaryIncome: 2_000_000,
      dividendIncome: 2_000_000,
      withholdingCredit: 50_000,
      householdSize: 2,
      exemptionCount: 2,
      filingStatus: 'married'
    });

    expect(result.dividendMethodA.dividendCredit).toBe(80_000);
    expect(result.dividendMethodA.dividendFlatTax).toBe(0);
    expect(result.dividendMethodA.totalTax).toBe(result.dividendMethodA.regularTax);
    expect(result.dividendMethodB.dividendCredit).toBe(0);
    expect(result.dividendMethodB.dividendFlatTax).toBe(560_000);
    expect(result.dividendMethodB.totalTax).toBe(
      result.dividendMethodB.regularTax + result.dividendMethodB.dividendFlatTax
    );
    expect(result.recommendedDividendMethod).toBe('A');
    expect(result.selectedDividendMethod).toBe('A');
    expect(result.regularTax).toBe(result.dividendMethodA.regularTax);
  });

  it('keeps dividend flat tax outside regularTax under method B and compares AMT with credit-adjusted regular tax', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIitDeductions(db, {
      fiscalYear: 115,
      children: [],
      applyLongTermCareDeduction: false,
      testNetIncome: 0,
      testTaxRate: 0.05,
      salaryIncome: 500_000,
      dividendIncome: 30_000_000,
      withholdingCredit: 20_000,
      overseasIncome: 8_000_000,
      householdSize: 1,
      exemptionCount: 1,
      filingStatus: 'single'
    });

    expect(result.recommendedDividendMethod).toBe('B');
    expect(result.selectedDividendMethod).toBe('B');
    expect(result.dividendMethodB.regularTax).toBe(0);
    expect(result.dividendMethodB.dividendFlatTax).toBe(8_400_000);
    expect(result.regularTax).toBe(0);
    expect(result.amt.regularTaxForAmt).toBe(0);
    expect(result.amt.overseasIncomeIncluded).toBe(8_000_000);
    expect(result.amt.additionalAmtTax).toBe(result.amt.amtTax);
  });
});
