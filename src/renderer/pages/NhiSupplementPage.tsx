import { useState } from 'react';
import type {
  NhiSupplementCalculationInput,
  NhiSupplementCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialInput: NhiSupplementCalculationInput = {
  fiscalYear: 115,
  currentBonus: 100_000,
  insuredSalary: 30_000,
  ytdBonusPaid: 50_000
};

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%`;
}

export function NhiSupplementPage() {
  const [input, setInput] = useState<NhiSupplementCalculationInput>(initialInput);
  const [result, setResult] = useState<NhiSupplementCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: NhiSupplementCalculationResult =
        await window.firmAPI.calc.nhiSupplement(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '補充保費試算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const yearControl = (
    <YearSelector
      mode="effective_year"
      value={input.fiscalYear}
      years={[115]}
      onChange={(year) =>
        setInput((current) => ({
          ...current,
          fiscalYear: year
        }))
      }
    />
  );

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">本次獎金</span>
          <input
            type="number"
            min={0}
            value={input.currentBonus}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                currentBonus: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">投保金額</span>
          <input
            type="number"
            min={0}
            value={input.insuredSalary}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                insuredSalary: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">累計已發獎金</span>
          <input
            type="number"
            min={0}
            value={input.ytdBonusPaid}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                ytdBonusPaid: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message="門檻 = 投保金額 × 4。未達門檻不課；跨門檻只課超過部分；已過門檻後本次獎金全額課；單次課費基礎上限 1,000 萬。"
      />

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中...' : '開始試算'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="補充保費率" value={formatRate(result.rate)} />
        <CalcResultCard label="門檻" value={result.threshold} />
        <CalcResultCard label="累計獎金" value={result.ytdTotalBonus} />
        <CalcResultCard label="補充保費" value={result.supplementPremium} tone="accent" />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>課費基礎</strong>
          <span>這裡同時顯示原始應課金額與 1,000 萬上限截斷後的金額。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard
            label="是否達門檻"
            value={result.thresholdReached ? '已達門檻' : '未達門檻'}
            tone={result.thresholdReached ? 'warning' : 'success'}
          />
          <CalcResultCard label="原始應課金額" value={result.taxableAmount} />
          <CalcResultCard label="上限截斷後" value={result.cappedTaxableAmount} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先輸入本次獎金、投保金額與累計已發獎金。</strong>
      <p>這頁重點是驗證 YTD 累計跨門檻時只課超過部分，而不是整筆重算。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="二代健保補充保費"
      subtitle="目前先做獎金累計機制。這裡的年度是 effective_year，不是所得年度。"
      historyCalculator="nhi-supplement"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
