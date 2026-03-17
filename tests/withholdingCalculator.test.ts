import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { calculateWithholding } from '../src/main/calculators/withholdingCalculator';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';
import type { WithholdingCalculationInput } from '../src/shared/ipc-types';

describe('C-5 withholding calculator baseline', () => {
  it('reads nonresident salary thresholds from WITHHOLD_NRA using effective_year', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const params114 = getYearlyParamMap(db, {
      fiscalYear: 114,
      category: 'WITHHOLD_NRA',
      usageContext: 'effective_year'
    });
    const params115 = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'WITHHOLD_NRA',
      usageContext: 'effective_year'
    });

    expect(params114.nra_salary_threshold).toBe(42885);
    expect(params115.nra_salary_threshold).toBe(44250);
  });

  it('applies the 6 percent rate when nonresident salary does not exceed the annual threshold', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const input: WithholdingCalculationInput = {
      fiscalYear: 115,
      incomeType: 'salary',
      payerType: 'individual',
      recipientResidency: 'nonresident',
      amount: 44250
    };

    const result = calculateWithholding(db, input);

    expect(result.taxRate).toBe(0.06);
    expect(result.withholding).toBe(2655);
    expect(result.note).toContain('非居住者薪資');
  });

  it('returns zero withholding for corporate landlords at the handler rule layer', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const input: WithholdingCalculationInput = {
      fiscalYear: 115,
      incomeType: 'rent',
      payerType: 'individual',
      recipientResidency: 'nonresident',
      landlordType: 'corporation',
      amount: 50000
    };

    const result = calculateWithholding(db, input);

    expect(result.withholding).toBe(0);
    expect(result.taxRate).toBe(0);
    expect(result.note).toContain('法人免扣繳');
  });
});
