import { describe, expect, it } from 'vitest';
import { calculateHouseLandTax } from '../src/main/calculators/houseLandTaxCalculator';

describe('C-11 house land tax calculator', () => {
  it('uses acquisitionDate for purchase', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2020-01-01',
      saleDate: '2026-01-01',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2020-01-01');
  });

  it('uses acquisitionDate for presale', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'presale',
      acquisitionDate: '2021-05-20',
      saleDate: '2026-06-20',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2021-05-20');
  });

  it('uses acquisitionDate for inheritance', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'inheritance',
      acquisitionDate: '2022-04-01',
      saleDate: '2026-05-01',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2022-04-01');
  });

  it('uses acquisitionDate for gift', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'gift',
      acquisitionDate: '2023-03-15',
      saleDate: '2026-03-15',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2023-03-15');
  });

  it('uses the later of land acquisition and usage license for self_built when license is later', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'self_built',
      landAcquisitionDate: '2020-01-01',
      usageLicenseDate: '2021-06-01',
      saleDate: '2026-06-01',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2021-06-01');
  });

  it('uses the later of land acquisition and usage license for self_built when land date is later', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'self_built',
      landAcquisitionDate: '2022-02-01',
      usageLicenseDate: '2021-06-01',
      saleDate: '2026-06-01',
      profitAmount: 5_000_000
    });

    expect(result.holdStartDate).toBe('2022-02-01');
  });

  it('uses end-of-month two-year deadline for leap-day repurchase', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2020-01-01',
      saleDate: '2024-02-29',
      replacementPurchaseDate: '2026-02-28',
      oldSalePrice: 12_000_000,
      newPurchasePrice: 12_000_000,
      profitAmount: 5_000_000
    });

    expect(result.repurchase.deadline).toBe('2026-02-28');
    expect(result.repurchase.withinTwoYears).toBe(true);
  });

  it('applies 45% for hold period up to two years', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2024-01-01',
      saleDate: '2025-12-31',
      profitAmount: 10_000_000
    });

    expect(result.rate).toBe(0.45);
    expect(result.taxPayable).toBe(4_500_000);
  });

  it('applies 35% for hold period over two years and up to five years', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2023-01-01',
      saleDate: '2026-01-02',
      profitAmount: 10_000_000
    });

    expect(result.rate).toBe(0.35);
    expect(result.taxPayable).toBe(3_500_000);
  });

  it('applies 20% for hold period over five years and up to ten years', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2019-01-01',
      saleDate: '2025-01-02',
      profitAmount: 10_000_000
    });

    expect(result.rate).toBe(0.2);
    expect(result.taxPayable).toBe(2_000_000);
  });

  it('applies 15% for hold period over ten years', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2010-01-01',
      saleDate: '2021-01-02',
      profitAmount: 10_000_000
    });

    expect(result.rate).toBe(0.15);
    expect(result.taxPayable).toBe(1_500_000);
  });

  it('applies self-use 10% rate after first four million exemption', () => {
    const result = calculateHouseLandTax({
      acquisitionMethod: 'purchase',
      acquisitionDate: '2010-01-01',
      saleDate: '2021-01-02',
      profitAmount: 10_000_000,
      selfUseEligible: true
    });

    expect(result.selfUseApplied).toBe(true);
    expect(result.taxableGain).toBe(6_000_000);
    expect(result.rate).toBe(0.1);
    expect(result.taxPayable).toBe(600_000);
  });
});
