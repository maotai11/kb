import { describe, expect, it } from 'vitest';
import { calculateResidencyDays } from '../src/main/calculators/residencyCalculator';

describe('C-16 residency calculator', () => {
  it('calculates days correctly in calendar_year mode', () => {
    const result = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [
        { entryDate: '2025-01-01', departureDate: '2025-04-01' },
        { entryDate: '2025-07-01', departureDate: '2025-10-01' }
      ]
    });

    expect(result.periodStart).toBe('2025-01-01');
    expect(result.periodEnd).toBe('2025-12-31');
    expect(result.totalDays).toBe(182);
    expect(result.isResident).toBe(false);
  });

  it('calculates rolling_12m period start and end correctly', () => {
    const result = calculateResidencyDays({
      mode: 'rolling_12m',
      referenceDate: '2026-03-15',
      stays: []
    });

    expect(result.periodStart).toBe('2025-03-16');
    expect(result.periodEnd).toBe('2026-03-15');
    expect(result.lawBasis).toContain('滾動12個月');
  });

  it('does not count the departure day', () => {
    const result = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [{ entryDate: '2025-01-01', departureDate: '2025-01-02' }]
    });

    expect(result.totalDays).toBe(1);
  });

  it('treats 182 days as nonresident', () => {
    const result = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [{ entryDate: '2025-01-01', departureDate: '2025-07-02' }]
    });

    expect(result.totalDays).toBe(182);
    expect(result.isResident).toBe(false);
  });

  it('treats 183 days as resident', () => {
    const result = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [{ entryDate: '2025-01-01', departureDate: '2025-07-03' }]
    });

    expect(result.totalDays).toBe(183);
    expect(result.isResident).toBe(true);
  });

  it('calculates rolling_12m with actual stays spanning two calendar years', () => {
    const result = calculateResidencyDays({
      mode: 'rolling_12m',
      referenceDate: '2025-06-01',
      stays: [
        { entryDate: '2024-06-01', departureDate: '2024-06-15' },
        { entryDate: '2024-12-20', departureDate: '2025-01-05' },
        { entryDate: '2025-05-01', departureDate: '2025-06-01' }
      ]
    });

    expect(result.periodStart).toBe('2024-06-02');
    expect(result.periodEnd).toBe('2025-06-01');
    expect(result.totalDays).toBe(60); // 13 + 16 + 31 = 60 days inside the 12m window
    expect(result.isResident).toBe(false);
  });

  it('never counts the departure day even across multiple stays', () => {
    const result = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [
        { entryDate: '2025-01-01', departureDate: '2025-01-02' },
        { entryDate: '2025-02-01', departureDate: '2025-02-02' }
      ]
    });

    expect(result.totalDays).toBe(2);
  });

  it('keeps the 182/183 threshold even with split stays', () => {
    const nonResident = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [
        { entryDate: '2025-01-01', departureDate: '2025-04-01' },
        { entryDate: '2025-06-01', departureDate: '2025-09-01' }
      ]
    });

    const resident = calculateResidencyDays({
      mode: 'calendar_year',
      taxYear: 2025,
      stays: [
        { entryDate: '2025-01-01', departureDate: '2025-03-31' },
        { entryDate: '2025-06-01', departureDate: '2025-09-03' }
      ]
    });

    expect(nonResident.totalDays).toBe(182);
    expect(nonResident.isResident).toBe(false);
    expect(resident.totalDays).toBe(183);
    expect(resident.isResident).toBe(true);
  });
});
