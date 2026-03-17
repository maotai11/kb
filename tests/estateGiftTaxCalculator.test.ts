import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';
import { calculateEstateGiftTax } from '../src/main/calculators/estateGiftTaxCalculator';

describe('C-14 estate/gift tax calculator', () => {
  function setupDb() {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);
    return db;
  }

  it('uses eventDate rather than fiscal year to determine bracket lookup year', () => {
    const db = setupDb();

    const beforeCutoff = calculateEstateGiftTax(db, {
      taxType: 'estate',
      eventDate: '2024-12-31',
      netTaxableAmount: 60_000_000
    });
    const onCutoff = calculateEstateGiftTax(db, {
      taxType: 'estate',
      eventDate: '2025-01-01',
      netTaxableAmount: 60_000_000
    });

    expect(beforeCutoff.lookupYear).toBe(113);
    expect(onCutoff.lookupYear).toBe(114);
  });

  it('reads 114 estate bracket progressive differences from DB instead of hardcoding', () => {
    const db = setupDb();

    const params = getYearlyParamMap(db, {
      fiscalYear: 114,
      category: 'TAX_ESTATE_BRACKET',
      usageContext: 'income_year'
    });

    expect(params.tier2_diff).toBe(2_810_500);
    expect(params.tier3_diff).toBe(8_431_500);
  });

  it('calculates estate tax correctly in each 114 bracket', () => {
    const db = setupDb();

    const tier1 = calculateEstateGiftTax(db, {
      taxType: 'estate',
      eventDate: '2025-01-01',
      netTaxableAmount: 40_000_000
    });
    const tier2 = calculateEstateGiftTax(db, {
      taxType: 'estate',
      eventDate: '2025-01-01',
      netTaxableAmount: 80_000_000
    });
    const tier3 = calculateEstateGiftTax(db, {
      taxType: 'estate',
      eventDate: '2025-01-01',
      netTaxableAmount: 120_000_000
    });

    expect(tier1.taxPayable).toBe(4_000_000);
    expect(tier1.bracketLabel).toBe('tier1');
    expect(tier2.taxPayable).toBe(9_189_500);
    expect(tier2.bracketLabel).toBe('tier2');
    expect(tier3.taxPayable).toBe(15_568_500);
    expect(tier3.bracketLabel).toBe('tier3');
  });

  it('calculates gift tax correctly using the same calculator function', () => {
    const db = setupDb();

    const tier1 = calculateEstateGiftTax(db, {
      taxType: 'gift',
      eventDate: '2025-01-01',
      netTaxableAmount: 20_000_000
    });
    const tier2 = calculateEstateGiftTax(db, {
      taxType: 'gift',
      eventDate: '2025-01-01',
      netTaxableAmount: 40_000_000
    });
    const tier3 = calculateEstateGiftTax(db, {
      taxType: 'gift',
      eventDate: '2025-01-01',
      netTaxableAmount: 60_000_000
    });

    expect(tier1.taxPayable).toBe(2_000_000);
    expect(tier2.taxPayable).toBe(4_594_500);
    expect(tier3.taxPayable).toBe(7_784_000);
  });
});
