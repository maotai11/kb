import type Database from 'better-sqlite3';
import type { AmtCalculationInput, AmtCalculationResult } from '../../shared/ipc-types';
import { getYearlyParamMap } from '../services/yearlyParamsService';

function roundAmount(value: number): number {
  return Math.round(value);
}

export function calculateIndividualAmt(
  db: Database.Database,
  input: AmtCalculationInput
): AmtCalculationResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'TAX_AMT',
    usageContext: 'income_year'
  });

  const amtExemption = Number(params.amt_exemption_individual ?? 0);
  const amtRate = Number(params.amt_rate_individual ?? 0.2);
  const insuranceDeathExemption = Number(params.insurance_death_benefit_exemption ?? 0);

  const regularTaxForAmt = Math.max(0, roundAmount(input.regularTax));
  const overseasIncomeIncluded =
    input.overseasIncome >= 1_000_000 ? roundAmount(input.overseasIncome) : 0;
  const insuranceDeathBenefitIncluded = Math.max(
    0,
    roundAmount(input.insuranceDeathBenefit - insuranceDeathExemption)
  );
  const insuranceNonDeathIncluded = Math.max(0, roundAmount(input.insuranceNonDeath));
  const privateFundGainIncluded = Math.max(0, roundAmount(input.privateFundGain));
  const nonCashDonationIncluded = Math.max(0, roundAmount(input.nonCashDonation));

  const basicIncome = Math.max(
    0,
    roundAmount(
      input.netIncome +
        overseasIncomeIncluded +
        insuranceDeathBenefitIncluded +
        insuranceNonDeathIncluded +
        privateFundGainIncluded +
        nonCashDonationIncluded
    )
  );

  const amtBase = Math.max(0, basicIncome - amtExemption);
  const amtTax = Math.max(0, roundAmount(amtBase * amtRate));
  const amtDiffBeforeForeignCredit = Math.max(0, amtTax - regularTaxForAmt);
  const foreignTaxCreditLimit =
    basicIncome > 0 && overseasIncomeIncluded > 0
      ? roundAmount(amtDiffBeforeForeignCredit * (overseasIncomeIncluded / basicIncome))
      : 0;
  const foreignTaxCreditUsed = Math.max(
    0,
    Math.min(roundAmount(input.foreignTaxPaid), foreignTaxCreditLimit)
  );
  const additionalAmtTax = Math.max(0, amtDiffBeforeForeignCredit - foreignTaxCreditUsed);

  return {
    amtBase,
    amtTax,
    regularTaxForAmt,
    overseasIncomeIncluded,
    insuranceDeathBenefitIncluded,
    insuranceNonDeathIncluded,
    privateFundGainIncluded,
    nonCashDonationIncluded,
    foreignTaxCreditLimit,
    foreignTaxCreditUsed,
    additionalAmtTax
  };
}
