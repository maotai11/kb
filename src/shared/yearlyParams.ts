export type UsageContext = 'income_year' | 'effective_year';

export type YearlyParamRecord = {
  fiscalYear: number;
  category: string;
  paramKey: string;
  usageContext: UsageContext;
  value: number | string | null;
};

export function selectYearlyParams(
  records: YearlyParamRecord[],
  fiscalYear: number,
  category: string,
  usageContext: UsageContext
): Record<string, number | string | null> {
  return records
    .filter(
      (record) =>
        record.fiscalYear === fiscalYear &&
        record.category === category &&
        record.usageContext === usageContext
    )
    .reduce<Record<string, number | string | null>>((result, record) => {
      result[record.paramKey] = record.value;
      return result;
    }, {});
}
