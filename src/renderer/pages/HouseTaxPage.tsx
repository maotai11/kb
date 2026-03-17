import { FormEvent, useMemo, useState } from 'react';
import type {
  HouseTaxCalculationInput,
  HouseTaxCalculationResult,
  HouseTaxUsageType
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

type UsageOption = {
  value: HouseTaxUsageType;
  label: string;
  defaultRate: number;
};

const USAGE_OPTIONS: UsageOption[] = [
  {
    value: 'self_use',
    label: '住家用（自住）',
    defaultRate: 0.012
  },
  {
    value: 'non_self_use',
    label: '住家用（非自住，限本人/配偶/未成年子女合計≤3戶）',
    defaultRate: 0.024
  },
  {
    value: 'business',
    label: '非住家用（營業用）',
    defaultRate: 0.03
  },
  {
    value: 'other_non_residential',
    label: '非住家用（其他）',
    defaultRate: 0.02
  }
];

const initialInput: HouseTaxCalculationInput = {
  houseValue: 3_000_000,
  usageType: 'self_use',
  rate: USAGE_OPTIONS[0].defaultRate
};

function formatPercent(rate: number) {
  return `${(rate * 100).toFixed(2)}%`;
}

export function HouseTaxPage() {
  const [input, setInput] = useState<HouseTaxCalculationInput>(initialInput);
  const [result, setResult] = useState<HouseTaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedUsage = useMemo(
    () => USAGE_OPTIONS.find((option) => option.value === input.usageType)!,
    [input.usageType]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    window.firmAPI.calc
      .houseTax(input)
      .then((output) => {
        setResult(output);
      })
      .catch((submitError) => {
        setError(submitError instanceof Error ? submitError.message : '發生錯誤');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">用途類型</span>
          <select
            value={input.usageType}
            onChange={(event) => {
              const nextUsage = event.target.value as HouseTaxUsageType;
              const defaultRate = USAGE_OPTIONS.find((option) => option.value === nextUsage)?.defaultRate;
              setInput((current) => ({
                ...current,
                usageType: nextUsage,
                rate: defaultRate ?? current.rate
              }));
            }}
          >
            {USAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">房屋基準值</span>
          <input
            type="number"
            min={0}
            value={input.houseValue}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                houseValue: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">適用稅率（小數）</span>
          <input
            type="number"
            step={0.0001}
            min={0}
            value={input.rate}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                rate: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message={`選定用途後會自動填入基準稅率 ${formatPercent(
          selectedUsage.defaultRate
        )}；輸入欄可手動調整模擬不同稅率。`}
      />

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '計算房屋稅'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="用途" value={selectedUsage.label} />
        <CalcResultCard label="房屋基準值" value={result.houseValue} />
        <CalcResultCard label="稅率" value={formatPercent(result.rate)} />
        <CalcResultCard label="估計稅額" value={result.tax} tone="accent" />
      </div>
    </div>
  ) : (
    <div className="empty-state">
      <strong>輸入資料後點「計算房屋稅」</strong>
      <p>本功能僅為試算，稅率可以微調以符合各地稅率實際狀況。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="房屋稅試算"
      subtitle="根據用途選取預設稅率或自行輸入，結果僅供估算，實際繳納以地方稅率為準。"
      yearControl={<span className="field-label">單次模擬</span>}
      historyCalculator="house-tax"
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
