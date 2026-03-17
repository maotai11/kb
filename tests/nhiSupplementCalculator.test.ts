import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { calculateNhiSupplementPremium } from '../src/main/calculators/nhiSupplementCalculator';

describe('C-8 NHI supplement premium calculator', () => {
  function setupDb() {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);
    return db;
  }

  it('returns zero when ytd total bonus stays below insured salary x4 threshold', () => {
    const db = setupDb();

    const result = calculateNhiSupplementPremium(db, {
      fiscalYear: 115,
      currentBonus: 100_000,
      insuredSalary: 30_000,
      ytdBonusPaid: 0
    });

    expect(result.threshold).toBe(120_000);
    expect(result.ytdTotalBonus).toBe(100_000);
    expect(result.taxableAmount).toBe(0);
    expect(result.supplementPremium).toBe(0);
  });

  it('taxes only the portion that crosses the threshold', () => {
    const db = setupDb();

    const result = calculateNhiSupplementPremium(db, {
      fiscalYear: 115,
      currentBonus: 100_000,
      insuredSalary: 30_000,
      ytdBonusPaid: 50_000
    });

    expect(result.threshold).toBe(120_000);
    expect(result.ytdTotalBonus).toBe(150_000);
    expect(result.taxableAmount).toBe(30_000);
    expect(result.supplementPremium).toBe(633);
  });

  it('taxes the full current bonus after ytd has already exceeded the threshold', () => {
    const db = setupDb();

    const result = calculateNhiSupplementPremium(db, {
      fiscalYear: 115,
      currentBonus: 100_000,
      insuredSalary: 30_000,
      ytdBonusPaid: 200_000
    });

    expect(result.taxableAmount).toBe(100_000);
    expect(result.supplementPremium).toBe(2_110);
  });

  it('caps taxable amount at ten million', () => {
    const db = setupDb();

    const result = calculateNhiSupplementPremium(db, {
      fiscalYear: 115,
      currentBonus: 9_999_999,
      insuredSalary: 30_000,
      ytdBonusPaid: 200_000
    });

    expect(result.taxableAmount).toBe(9_999_999);
    expect(result.cappedTaxableAmount).toBe(9_999_999);
    expect(result.supplementPremium).toBe(211_000);

    const capped = calculateNhiSupplementPremium(db, {
      fiscalYear: 115,
      currentBonus: 12_000_000,
      insuredSalary: 30_000,
      ytdBonusPaid: 200_000
    });

    expect(capped.taxableAmount).toBe(12_000_000);
    expect(capped.cappedTaxableAmount).toBe(10_000_000);
    expect(capped.supplementPremium).toBe(211_000);
  });
});
