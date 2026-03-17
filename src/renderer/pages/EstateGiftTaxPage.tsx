import { useState } from 'react';
import type {
  EstateGiftTaxCalculationInput,
  EstateGiftTaxCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const initialInput: EstateGiftTaxCalculationInput = {
  taxType: 'estate',
  eventDate: '2025-01-01',
  netTaxableAmount: 80_000_000
};

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%`;
}

export function EstateGiftTaxPage() {
  const [input, setInput] = useState<EstateGiftTaxCalculationInput>(initialInput);
  const [result, setResult] = useState<EstateGiftTaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: EstateGiftTaxCalculationResult = await window.firmAPI.calc.estateGiftTax(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '遺贈稅試算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">稅目</span>
          <select
            value={input.taxType}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                taxType: event.target.value as EstateGiftTaxCalculationInput['taxType']
              }))
            }
          >
            <option value="estate">遺產稅</option>
            <option value="gift">贈與稅</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">事件日期</span>
          <input
            type="date"
            value={input.eventDate}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                eventDate: event.target.value
              }))
            }
          />
        </label>
      </div>

      <div className="field-grid field-grid-single">
        <label className="field">
          <span className="field-label">課稅淨額</span>
          <input
            type="number"
            min={0}
            value={input.netTaxableAmount}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                netTaxableAmount: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message="級距年度由 eventDate 決定，不看 fiscal_year。2025-01-01 當天起切換到 114 年新級距。"
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
        <CalcResultCard label="適用級距年度" value={`${result.lookupYear} 年`} />
        <CalcResultCard label="適用稅率" value={formatRate(result.rate)} />
        <CalcResultCard label="累進差額" value={result.progressiveDifference} />
        <CalcResultCard label="應納稅額" value={result.taxPayable} tone="accent" />
      </div>
      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>區段判定</strong>
          <span>公式固定為 課稅淨額 × 稅率 - 累進差額，差額來自 yearly_params。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="稅目" value={result.taxType === 'estate' ? '遺產稅' : '贈與稅'} />
          <CalcResultCard label="適用區段" value={result.bracketLabel} />
          <CalcResultCard label="第一段上限" value={result.bracketCeilings.tier1} />
          <CalcResultCard label="第二段上限" value={result.bracketCeilings.tier2} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先選稅目、事件日期與課稅淨額。</strong>
      <p>這頁重點是驗證 eventDate 切換級距年度，以及累進差額是否從資料表正確讀取。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="遺產稅 / 贈與稅試算"
      subtitle="遺產稅與贈與稅共用同一支 calculator，差別只在 taxType 與對應級距表。"
      historyCalculator="estate-gift-tax"
      yearControl={<span className="field-label">事件日期決定級距年度</span>}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
