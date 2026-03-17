import { useState } from 'react';
import type { LandValueTaxInput, LandValueTaxResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const initialInput: LandValueTaxInput = {
  assessedValue: 10_000,
  psUnit: 1_000,
  selfUse: false
};

function formatNumber(value: number): string {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
}

export function LandValueTaxPage() {
  const [input, setInput] = useState<LandValueTaxInput>(initialInput);
  const [result, setResult] = useState<LandValueTaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output = await window.firmAPI.calc.landValueTax(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '計算失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <CalcPageLayout
      title="C-15 地價稅"
      subtitle="依照公告地價 × 面積的 PS 倍數拆成 6 段，展開稅率與應納金額細節。"
      historyCalculator="land-value-tax"
      yearControl={<span className="field-label">PS 商品</span>}
      inputPanel={
        <form className="calc-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">公告地價總額（元）</span>
              <input
                type="number"
                min={0}
                value={input.assessedValue}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    assessedValue: Number(event.target.value)
                  }))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">PS 基數（公告地價 × 面積）</span>
              <input
                type="number"
                min={1}
                value={input.psUnit}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    psUnit: Number(event.target.value) || 0
                  }))
                }
              />
            </label>
          </div>
          <label className="field toggle-field">
            <input
              type="checkbox"
              checked={input.selfUse === true}
              onChange={(event) =>
                setInput((current) => ({ ...current, selfUse: event.target.checked }))
              }
            />
            <span className="field-label">自用住宅優惠（0.2%）</span>
          </label>
          <SectionWarning
            message="每段級距的課稅金額會顯示 課稅額 × 稅率 = 稅額，方便比對 4PS/5PS 的寬度。"
          />
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? '計算中...' : '計算地價稅'}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      }
      resultPanel={
        result ? (
          <div className="result-stack">
            <CalcResultCard
              label="應納稅額"
              value={formatNumber(result.tax)}
              tone="accent"
            />
            <section className="comparison-panel">
              <div className="comparison-header">
                <strong>各段級距明細</strong>
                <span>每段 課稅額 × 稅率 = 稅額</span>
              </div>
              <div className="land-value-steps">
                <div className="land-value-row land-value-heading">
                  <span>級距</span>
                  <span>課稅額</span>
                  <span>稅率</span>
                  <span>稅額</span>
                  <span>計算式</span>
                </div>
                {result.steps.map((step, index) => (
                  <div className="land-value-row" key={`${step.taxable}-${index}`}>
                    <span>{index + 1}</span>
                    <span>{formatNumber(step.taxable)}</span>
                    <span>{(step.rate * 100).toFixed(2)}%</span>
                    <span>{formatNumber(step.taxAmount)}</span>
                    <span>
                      {formatNumber(step.taxable)} × {(step.rate * 100).toFixed(2)}% =
                      {' ' + formatNumber(step.taxAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="empty-state">
            <strong>輸入公告地價總額與 PS 基數，按下計算即可查看每段課稅細節。</strong>
          </div>
        )
      }
    />
  );
}
