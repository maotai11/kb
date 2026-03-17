import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';

describe('database migrations and seeds', () => {
  it('creates yearly_params with usage_context and filing_year in migration 001', () => {
    const db = new Database(':memory:');

    migrateDatabase(db);

    const columns = db.prepare("PRAGMA table_info('yearly_params')").all() as Array<{ name: string }>;
    const names = columns.map((column) => column.name);

    expect(names).toContain('usage_context');
    expect(names).toContain('filing_year');

    const historyColumns = db.prepare("PRAGMA table_info('calc_history')").all() as Array<{ name: string }>;
    const historyNames = historyColumns.map((column) => column.name);
    expect(historyNames).toContain('params_snapshot');
    expect(historyNames).toContain('is_bookmarked');

    const holidayColumns = db.prepare("PRAGMA table_info('holidays')").all() as Array<{ name: string }>;
    const holidayNames = holidayColumns.map((column) => column.name);
    expect(holidayNames).toContain('holiday_date');
    expect(holidayNames).toContain('year');
    expect(holidayNames).toContain('is_makeup');
  });

  it('stores seeded params with explicit usage_context and returns only matching rows', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const laborParams = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'LABOR',
      usageContext: 'effective_year'
    });

    expect(laborParams).toMatchObject({
      min_wage_monthly: 29500,
      labor_ins_rate: 0.12,
      nhi_rate: 0.0517
    });

    const wrongContext = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'LABOR',
      usageContext: 'income_year'
    });

    expect(wrongContext).toEqual({});
  });

  it('stores TAX_AMT params under income_year so 113 and 115 cases resolve different exemptions', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const params113 = getYearlyParamMap(db, {
      fiscalYear: 113,
      category: 'TAX_AMT',
      usageContext: 'income_year'
    });

    const params115 = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_AMT',
      usageContext: 'income_year'
    });

    expect(params113).toMatchObject({
      amt_exemption_individual: 7000000,
      insurance_death_benefit_exemption: 33300000
    });
    expect(params115).toMatchObject({
      amt_exemption_individual: 7500000,
      insurance_death_benefit_exemption: 37400000
    });
  });

  it('seeds minimal holidays for 2025 and 2026', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const holidays2025 = db
      .prepare(
        `
          SELECT holiday_date, name, year, is_makeup
          FROM holidays
          WHERE year = 2025
          ORDER BY holiday_date
        `
      )
      .all() as Array<{
      holiday_date: string;
      name: string | null;
      year: number;
      is_makeup: number;
    }>;

    const holidays2026 = db
      .prepare(
        `
          SELECT holiday_date, name, year, is_makeup
          FROM holidays
          WHERE year = 2026
          ORDER BY holiday_date
        `
      )
      .all() as Array<{
      holiday_date: string;
      name: string | null;
      year: number;
      is_makeup: number;
    }>;

    expect(holidays2025.length).toBeGreaterThan(0);
    expect(holidays2025).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          holiday_date: '2025-03-03',
          year: 2025,
          is_makeup: 0
        }),
        expect.objectContaining({
          holiday_date: '2025-03-08',
          year: 2025,
          is_makeup: 1
        })
      ])
    );
    expect(holidays2026.length).toBeGreaterThan(0);
  });
});
