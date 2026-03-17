import { useState } from 'react';
import type { CitCalculationInput, CitCalculationResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialInput: CitCalculationInput = {
  fiscalYear: 115,
  taxableIncome: 160_000
};

export function CITPage() {
  const [input, setInput] = useState<CitCalculationInput>(initialInput);
  const [result, setResult] = useState<CitCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: CitCalculationResult = await window.firmAPI.calc.cit(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '營所稅計算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const yearControl = (
    <YearSelector
      mode="income_year"
      value={input.fiscalYear}
      years={[113, 114, 115]}
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
      <div className="field-grid field-grid-single">
        <label className="field">
          <span className="field-label">課稅所得額</span>
          <input
            type="number"
            value={input.taxableIncome}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                taxableIncome: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        message="臨界點是 200,000。120,001 到 200,000 走半數平滑，201,000 起回到一般 20% 稅率路線。"
        severity="info"
      />

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '試算營所稅'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="免稅門檻" value={result.exemptionThreshold} />
        <CalcResultCard label="一般稅額" value={result.normalTax} />
        <CalcResultCard label="半數平滑" value={result.excessHalfTax} />
        <CalcResultCard label="應納稅額" value={result.taxPayable} tone="accent" />
      </div>
      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>適用路線</strong>
          <span>結果直接顯示是哪一條規則生效，方便核對 smooth mechanism。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard
            label="路線"
            value={
              result.appliedRule === 'exempt'
                ? '免稅額內'
                : result.appliedRule === 'smooth'
                  ? '半數平滑'
                  : '一般稅率'
            }
            tone={result.appliedRule === 'smooth' ? 'warning' : 'default'}
          />
          <CalcResultCard label="適用稅率" value={`${result.taxRate * 100}%`} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先輸入課稅所得額，再檢查是否落在 200,000 的 smooth mechanism 臨界區間。</strong>
      <p>C-3 是最快能驗證年度參數、平滑公式與 renderer 骨架是否協同運作的下一個 calculator。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="營利事業所得稅"
      subtitle="這裡的年度是 income_year。結果同時列出 normal tax 與 excess-half，避免只看最終稅額卻不知道走哪條路線。"
      historyCalculator="cit"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
