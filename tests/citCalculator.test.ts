import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { calculateCit } from '../src/main/calculators/citCalculator';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';

describe('C-3 CIT calculator', () => {
  it('reads TAX_CIT params using income_year', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const params = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_CIT',
      usageContext: 'income_year'
    });

    expect(params.cit_rate).toBe(0.2);
    expect(params.cit_exemption_threshold).toBe(120000);

    const wrongContext = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_CIT',
      usageContext: 'effective_year'
    });

    expect(wrongContext).toEqual({});
  });

  it('returns zero within the exemption threshold', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateCit(db, {
      fiscalYear: 115,
      taxableIncome: 120_000
    });

    expect(result.taxPayable).toBe(0);
    expect(result.appliedRule).toBe('exempt');
  });

  it('uses the smooth mechanism below the 200,000 turning point', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateCit(db, {
      fiscalYear: 115,
      taxableIncome: 160_000
    });

    expect(result.normalTax).toBe(32_000);
    expect(result.excessHalfTax).toBe(20_000);
    expect(result.taxPayable).toBe(20_000);
    expect(result.appliedRule).toBe('smooth');
  });

  it('matches at the 200,000 turning point', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateCit(db, {
      fiscalYear: 115,
      taxableIncome: 200_000
    });

    expect(result.normalTax).toBe(40_000);
    expect(result.excessHalfTax).toBe(40_000);
    expect(result.taxPayable).toBe(40_000);
    expect(result.appliedRule).toBe('normal');
  });

  it('switches to the normal-tax path above the turning point', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateCit(db, {
      fiscalYear: 115,
      taxableIncome: 201_000
    });

    expect(result.normalTax).toBe(40_200);
    expect(result.excessHalfTax).toBe(40_500);
    expect(result.taxPayable).toBe(40_200);
    expect(result.appliedRule).toBe('normal');
  });
});
