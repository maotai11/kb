import { describe, expect, it } from 'vitest';
import { selectYearlyParams, type YearlyParamRecord } from '../src/shared/yearlyParams';

describe('selectYearlyParams', () => {
  it('selects only the matching fiscal year and usage context', () => {
    const records: YearlyParamRecord[] = [
      {
        fiscalYear: 114,
        category: 'TAX_IIT',
        paramKey: 'exemption_general',
        usageContext: 'income_year',
        value: 97000
      },
      {
        fiscalYear: 115,
        category: 'TAX_IIT',
        paramKey: 'exemption_general',
        usageContext: 'income_year',
        value: 101000
      },
      {
        fiscalYear: 115,
        category: 'LABOR',
        paramKey: 'min_wage_monthly',
        usageContext: 'effective_year',
        value: 29500
      }
    ];

    expect(selectYearlyParams(records, 115, 'TAX_IIT', 'income_year')).toEqual({
      exemption_general: 101000
    });
    expect(selectYearlyParams(records, 115, 'LABOR', 'effective_year')).toEqual({
      min_wage_monthly: 29500
    });
  });
});
