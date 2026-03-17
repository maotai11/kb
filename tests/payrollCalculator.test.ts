import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { calculatePayroll } from '../src/main/calculators/payrollCalculator';
import { lookupGrade } from '../src/main/services/gradeTableService';
import type { PayrollCalculationInput } from '../src/shared/ipc-types';

describe('C-7 payroll calculator baseline', () => {
  it('looks up labor grade using the dedicated LABOR_INS grade table', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const grade = lookupGrade(db, {
      fiscalYear: 115,
      tableType: 'LABOR_INS',
      salary: 42001
    });

    expect(grade).toMatchObject({
      insuredSalary: 43900,
      grade: 10
    });
  });

  it('calculates labor, NHI, and pension contributions with a frozen IPC shape', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);

    const input: PayrollCalculationInput = {
      fiscalYear: 115,
      salary: 42001,
      dependentsCount: 0,
      occupationalAccidentRate: 0.0011,
      voluntaryPensionRate: 0.06
    };

    const result = calculatePayroll(db, input);

    expect(result.gradeTableVersion).toBe('115-baseline');
    expect(result.insuredSalaries).toEqual({
      laborIns: 43900,
      nhi: 42001,
      pension: 42001
    });
    expect(result.employeeContribution).toEqual({
      laborInsurance: 1054,
      healthInsurance: 651,
      pension: 2520
    });
    expect(result.employerContribution).toEqual({
      laborInsurance: 3688,
      occupationalAccident: 48,
      healthInsurance: 1303,
      healthInsuranceDependents: 0,
      pension: 2520
    });
  });
});
