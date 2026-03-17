import type { OvertimeCalculationInput, OvertimeCalculationResult } from '../../shared/ipc-types';

function roundAmount(value: number): number {
  return Math.round(value);
}

function getBaseHourlyWage(monthlySalary: number): number {
  return monthlySalary / 30 / 8;
}

export function calculateOvertime(input: OvertimeCalculationInput): OvertimeCalculationResult {
  const monthlySalary = Math.max(0, roundAmount(input.monthlySalary));
  const hours = Math.max(0, roundAmount(input.hours));
  const baseHourlyWage = getBaseHourlyWage(monthlySalary);

  if (input.dayType === 'holiday') {
    const tier1Pay = roundAmount(baseHourlyWage * hours * 2);
    return {
      dayType: input.dayType,
      monthlySalary,
      hours,
      baseHourlyWage,
      tier1Hours: hours,
      tier2Hours: 0,
      tier1Multiplier: 2,
      tier2Multiplier: 0,
      tier1Pay,
      tier2Pay: 0,
      overtimePay: tier1Pay,
      note: '例假日/國定假日試算先按全部 × 2 處理。'
    };
  }

  const tier1Hours = Math.min(hours, 2);
  const tier2Hours = Math.max(0, hours - 2);
  const tier1Multiplier = 4 / 3;
  const tier2Multiplier = 5 / 3;
  const tier1Pay = roundAmount(baseHourlyWage * tier1Hours * tier1Multiplier);
  const tier2Pay = roundAmount(baseHourlyWage * tier2Hours * tier2Multiplier);

  return {
    dayType: input.dayType,
    monthlySalary,
    hours,
    baseHourlyWage,
    tier1Hours,
    tier2Hours,
    tier1Multiplier,
    tier2Multiplier,
    tier1Pay,
    tier2Pay,
    overtimePay: tier1Pay + tier2Pay,
    note:
      input.dayType === 'rest_day'
        ? '休息日只有兩段，沒有第三段。'
        : '平日加班採前 2 小時 × 4/3，後續 × 5/3。'
  };
}
