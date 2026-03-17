type YearSelectorMode = 'income_year' | 'effective_year';

type YearSelectorProps = {
  mode: YearSelectorMode;
  value: number;
  onChange: (year: number) => void;
  years?: number[];
};

function formatGregorianYear(minguoYear: number): number {
  return minguoYear + 1911;
}

function buildIncomeYearLabel(minguoYear: number): string {
  const incomeYear = formatGregorianYear(minguoYear);
  const filingYear = formatGregorianYear(minguoYear + 1);
  const suffix =
    minguoYear === 114 ? ' ← 建議' : minguoYear >= 115 ? ' 預估' : '';

  return `${minguoYear}年度（${incomeYear}年所得 · ${filingYear}年5月申報）${suffix}`;
}

function buildEffectiveYearLabel(minguoYear: number): string {
  const effectiveYear = formatGregorianYear(minguoYear);
  return `${minguoYear}年度（${effectiveYear}年1月起生效費率）`;
}

function buildLabel(mode: YearSelectorMode, minguoYear: number): string {
  return mode === 'income_year'
    ? buildIncomeYearLabel(minguoYear)
    : buildEffectiveYearLabel(minguoYear);
}

export function YearSelector({
  mode,
  value,
  onChange,
  years = [113, 114, 115]
}: YearSelectorProps) {
  return (
    <label className="field">
      <span className="field-label">
        {mode === 'income_year' ? '所得年度' : '費率年度'}
      </span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {years.map((year) => (
          <option key={year} value={year}>
            {buildLabel(mode, year)}
          </option>
        ))}
      </select>
    </label>
  );
}
