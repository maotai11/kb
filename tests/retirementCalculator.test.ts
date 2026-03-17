import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { getYearlyParamMap } from '../src/main/services/yearlyParamsService';
import { calculateRetirementIncome } from '../src/main/calculators/retirementCalculator';

describe('C-9 retirement calculator', () => {
  function setupDb() {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);
    return db;
  }

  it('reads retirement annual exempt amounts using income_year', () => {
    const db = setupDb();

    const params113 = getYearlyParamMap(db, {
      fiscalYear: 113,
      category: 'TAX_IIT',
      usageContext: 'income_year'
    });
    const params114 = getYearlyParamMap(db, {
      fiscalYear: 114,
      category: 'TAX_IIT',
      usageContext: 'income_year'
    });
    const params115 = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_IIT',
      usageContext: 'income_year'
    });

    expect(params113.retirement_lump_annual).toBe(188000);
    expect(params114.retirement_lump_annual).toBe(198000);
    expect(params115.retirement_lump_annual).toBe(206000);

    const wrongContext = getYearlyParamMap(db, {
      fiscalYear: 115,
      category: 'TAX_IIT',
      usageContext: 'effective_year'
    });

    expect(wrongContext).toEqual({});
  });

  it('keeps total equal to tier1 fully tax exempt', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 115,
      paymentType: 'lump',
      yearsOfService: 10,
      totalAmount: 2_060_000
    });

    expect(result.error).toBeNull();
    if (result.error !== null) {
      throw new Error('unexpected error');
    }
    expect(result.tier1Amount).toBe(2_060_000);
    expect(result.taxableAmount).toBe(0);
    expect(result.appliedTier).toBe('tier1');
  });

  it('taxes only half of the amount just above tier1', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 115,
      paymentType: 'lump',
      yearsOfService: 10,
      totalAmount: 2_060_001
    });

    expect(result.error).toBeNull();
    if (result.error !== null) {
      throw new Error('unexpected error');
    }
    expect(result.taxableAmount).toBe(1);
    expect(result.appliedTier).toBe('tier2');
  });

  it('keeps total equal to tier2 at half of tier1 taxable', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 115,
      paymentType: 'lump',
      yearsOfService: 10,
      totalAmount: 4_120_000
    });

    expect(result.error).toBeNull();
    if (result.error !== null) {
      throw new Error('unexpected error');
    }
    expect(result.taxableAmount).toBe(1_030_000);
    expect(result.appliedTier).toBe('tier2');
  });

  it('switches to the third tier immediately above tier2', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 115,
      paymentType: 'lump',
      yearsOfService: 10,
      totalAmount: 4_120_001
    });

    expect(result.error).toBeNull();
    if (result.error !== null) {
      throw new Error('unexpected error');
    }
    expect(result.taxableAmount).toBe(1_030_001);
    expect(result.appliedTier).toBe('tier3');
  });

  it('returns a clear error when 115 annuity exempt amount is not announced', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 115,
      paymentType: 'annuity',
      yearsOfService: 10,
      totalAmount: 900_000
    });

    expect(result.error).toBe('115年度分期退職定額免稅額尚未公告，請選擇一次領或改用114年試算');
    expect(result.taxableAmount).toBeNull();
    expect(result.annualExempt).toBeNull();
  });

  it('uses annuity annual exempt amount when available', () => {
    const db = setupDb();

    const result = calculateRetirementIncome(db, {
      fiscalYear: 114,
      paymentType: 'annuity',
      yearsOfService: 10,
      totalAmount: 900_000
    });

    expect(result.error).toBeNull();
    if (result.error !== null) {
      throw new Error('unexpected error');
    }
    expect(result.annualExempt).toBe(859_000);
    expect(result.taxableAmount).toBe(41_000);
    expect(result.appliedTier).toBe('annuity');
  });
});
