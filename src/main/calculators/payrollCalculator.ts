import type Database from 'better-sqlite3';
import type { PayrollCalculationInput, PayrollCalculationResult } from '../../shared/ipc-types';
import { lookupGrade, getGradeTable } from '../services/gradeTableService';
import { getYearlyParamMap } from '../services/yearlyParamsService';

function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculatePayroll(
  db: Database.Database,
  input: PayrollCalculationInput
): PayrollCalculationResult {
  const params = getYearlyParamMap(db, {
    fiscalYear: input.fiscalYear,
    category: 'LABOR',
    usageContext: 'effective_year'
  });

  const laborInsuredSalary = lookupGrade(db, {
    fiscalYear: input.fiscalYear,
    tableType: 'LABOR_INS',
    salary: input.salary
  }).insuredSalary;
  const nhiInsuredSalary = lookupGrade(db, {
    fiscalYear: input.fiscalYear,
    tableType: 'NHI',
    salary: input.salary
  }).insuredSalary;
  const pensionSalary = lookupGrade(db, {
    fiscalYear: input.fiscalYear,
    tableType: 'PENSION',
    salary: input.salary
  }).insuredSalary;

  const laborInsRate = Number(params.labor_ins_rate ?? 0);
  const nhiRate = Number(params.nhi_rate ?? 0);
  const nhiAvgDependents = Number(params.nhi_avg_dependents ?? 0);
  const employerPensionMinRate = Number(params.pension_employer_min_rate ?? 0.06);

  const gradeTableVersion = getGradeTable(db, input.fiscalYear, 'LABOR_INS').version;

  const employeeLaborInsurance = roundCurrency(laborInsuredSalary * laborInsRate * 0.2);
  const employerLaborInsurance = roundCurrency(laborInsuredSalary * laborInsRate * 0.7);
  const employeeHealthInsurance = roundCurrency(nhiInsuredSalary * nhiRate * 0.3);
  const employerHealthInsurance = roundCurrency(nhiInsuredSalary * nhiRate * 0.6);
  const employerHealthDependents = roundCurrency(
    nhiInsuredSalary * nhiRate * 0.6 * nhiAvgDependents * input.dependentsCount
  );
  const occupationalAccident = roundCurrency(laborInsuredSalary * input.occupationalAccidentRate);
  const employeePension = roundCurrency(pensionSalary * input.voluntaryPensionRate);
  const employerPension = roundCurrency(pensionSalary * employerPensionMinRate);

  return {
    fiscalYear: input.fiscalYear,
    gradeTableVersion,
    paramsVersion: `LABOR-${input.fiscalYear}-baseline`,
    insuredSalaries: {
      laborIns: laborInsuredSalary,
      nhi: nhiInsuredSalary,
      pension: pensionSalary
    },
    employeeContribution: {
      laborInsurance: employeeLaborInsurance,
      healthInsurance: employeeHealthInsurance,
      pension: employeePension
    },
    employerContribution: {
      laborInsurance: employerLaborInsurance,
      occupationalAccident,
      healthInsurance: employerHealthInsurance,
      healthInsuranceDependents: employerHealthDependents,
      pension: employerPension
    }
  };
}
