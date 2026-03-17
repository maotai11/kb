import { describe, expect, it } from 'vitest';
import { calculateOvertime } from '../src/main/calculators/overtimeCalculator';

describe('C-12 overtime calculator', () => {
  it('keeps rest_day at two tiers when hours equal 2', () => {
    const result = calculateOvertime({
      dayType: 'rest_day',
      monthlySalary: 36_000,
      hours: 2
    });

    expect(result.tier1Hours).toBe(2);
    expect(result.tier2Hours).toBe(0);
  });

  it('switches rest_day from tier1 to tier2 after two hours', () => {
    const result = calculateOvertime({
      dayType: 'rest_day',
      monthlySalary: 36_000,
      hours: 3
    });

    expect(result.tier1Hours).toBe(2);
    expect(result.tier2Hours).toBe(1);
  });

  it('never creates a third tier for rest_day even at 12 hours', () => {
    const result = calculateOvertime({
      dayType: 'rest_day',
      monthlySalary: 36_000,
      hours: 12
    });

    expect(result.tier1Hours).toBe(2);
    expect(result.tier2Hours).toBe(10);
    expect(result.note).toContain('沒有第三段');
  });

  it('calculates weekday overtime for two hours using only the first multiplier', () => {
    const result = calculateOvertime({
      dayType: 'weekday',
      monthlySalary: 36_000,
      hours: 2
    });

    expect(result.tier1Hours).toBe(2);
    expect(result.tier2Hours).toBe(0);
    expect(result.tier1Pay).toBe(400);
    expect(result.overtimePay).toBe(400);
  });

  it('calculates weekday overtime for four hours using both tiers', () => {
    const result = calculateOvertime({
      dayType: 'weekday',
      monthlySalary: 36_000,
      hours: 4
    });

    expect(result.tier1Hours).toBe(2);
    expect(result.tier2Hours).toBe(2);
    expect(result.tier1Pay).toBe(400);
    expect(result.tier2Pay).toBe(500);
    expect(result.overtimePay).toBe(900);
  });

  it('treats holiday overtime as a single x2 multiplier', () => {
    const result = calculateOvertime({
      dayType: 'holiday',
      monthlySalary: 36_000,
      hours: 8
    });

    expect(result.tier1Hours).toBe(8);
    expect(result.tier2Hours).toBe(0);
    expect(result.tier1Multiplier).toBe(2);
    expect(result.overtimePay).toBe(2_400);
  });
});
