import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { calculateIndividualAmt } from '../src/main/calculators/amtCalculator';

describe('C-10 AMT calculator', () => {
  it('reads 113-year exemption values from yearly_params instead of hardcoding 114+ amounts', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIndividualAmt(db, {
      fiscalYear: 113,
      regularTax: 100_000,
      netIncome: 7_200_000,
      overseasIncome: 0,
      insuranceDeathBenefit: 34_000_000,
      insuranceNonDeath: 0,
      privateFundGain: 0,
      nonCashDonation: 0,
      foreignTaxPaid: 0
    });

    expect(result.insuranceDeathBenefitIncluded).toBe(700_000);
    expect(result.amtBase).toBe(900_000);
    expect(result.amtTax).toBe(180_000);
  });

  it('includes overseas income only when the whole amount reaches one million', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const belowThreshold = calculateIndividualAmt(db, {
      fiscalYear: 115,
      regularTax: 0,
      netIncome: 7_000_000,
      overseasIncome: 999_999,
      insuranceDeathBenefit: 0,
      insuranceNonDeath: 0,
      privateFundGain: 0,
      nonCashDonation: 0,
      foreignTaxPaid: 0
    });

    const aboveThreshold = calculateIndividualAmt(db, {
      fiscalYear: 115,
      regularTax: 0,
      netIncome: 7_000_000,
      overseasIncome: 1_200_000,
      insuranceDeathBenefit: 0,
      insuranceNonDeath: 0,
      privateFundGain: 0,
      nonCashDonation: 0,
      foreignTaxPaid: 0
    });

    expect(belowThreshold.overseasIncomeIncluded).toBe(0);
    expect(aboveThreshold.overseasIncomeIncluded).toBe(1_200_000);
  });

  it('treats death benefits and non-death benefits differently', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIndividualAmt(db, {
      fiscalYear: 115,
      regularTax: 0,
      netIncome: 7_000_000,
      overseasIncome: 0,
      insuranceDeathBenefit: 40_000_000,
      insuranceNonDeath: 2_000_000,
      privateFundGain: 0,
      nonCashDonation: 0,
      foreignTaxPaid: 0
    });

    expect(result.insuranceDeathBenefitIncluded).toBe(2_600_000);
    expect(result.insuranceNonDeathIncluded).toBe(2_000_000);
  });

  it('limits foreign tax credit by the overseas-income ratio instead of directly offsetting all amt diff', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIndividualAmt(db, {
      fiscalYear: 115,
      regularTax: 200_000,
      netIncome: 7_500_000,
      overseasIncome: 2_000_000,
      insuranceDeathBenefit: 0,
      insuranceNonDeath: 0,
      privateFundGain: 500_000,
      nonCashDonation: 0,
      foreignTaxPaid: 500_000
    });

    expect(result.amtBase).toBe(2_500_000);
    expect(result.amtTax).toBe(500_000);
    expect(result.regularTaxForAmt).toBe(200_000);
    expect(result.foreignTaxCreditLimit).toBe(60_000);
    expect(result.foreignTaxCreditUsed).toBe(60_000);
    expect(result.additionalAmtTax).toBe(240_000);
  });

  it('clamps negative regularTax before AMT comparison', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const result = calculateIndividualAmt(db, {
      fiscalYear: 115,
      regularTax: -20_000,
      netIncome: 8_000_000,
      overseasIncome: 0,
      insuranceDeathBenefit: 0,
      insuranceNonDeath: 0,
      privateFundGain: 0,
      nonCashDonation: 0,
      foreignTaxPaid: 0
    });

    expect(result.regularTaxForAmt).toBe(0);
    expect(result.additionalAmtTax).toBe(100_000);
  });
});
