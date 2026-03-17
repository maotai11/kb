import { useState } from 'react';
import type {
  DeadlineCalculationInput,
  DeadlineCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const initialInput: DeadlineCalculationInput = {
  rawDeadline: '2025-02-28'
};

export function DeadlinePage() {
  const [input, setInput] = useState<DeadlineCalculationInput>(initialInput);
  const [result, setResult] = useState<DeadlineCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output = await window.firmAPI.calc.deadline(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Deadline calculation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Raw deadline</span>
        <input
          type="date"
          value={input.rawDeadline}
          onChange={(event) => setInput({ rawDeadline: event.target.value })}
        />
      </label>

      <SectionWarning
        severity="info"
        message="Weekend first, then holidays with is_makeup=0. The loop continues until the first working day."
      />

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中...' : '計算順延日期'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="Raw deadline" value={result.rawDeadline} />
        <CalcResultCard label="Adjusted deadline" value={result.adjustedDeadline} tone="accent" />
        <CalcResultCard label="Adjustment days" value={result.adjustmentDays} />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>Adjustment steps</strong>
          <span>{result.steps.length ? 'Loop trace from the rule engine' : 'No adjustment needed'}</span>
        </div>
        {result.steps.length ? (
          <div className="result-grid">
            {result.steps.map((step) => (
              <CalcResultCard
                key={`${step.date}-${step.reason}`}
                label={step.date}
                value={step.reason}
                hint={step.holidayName ?? undefined}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>Module D 自動回傳週末與假日後第一個工作日。</strong>
      <p>假日資料從 SQLite 讀取，日期計算完全在本機執行。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="Module D 申報期限順延"
      subtitle="自動調整申報截止日，遇週六、週日、國定假日與連假一律順延至下一工作日。"
      historyCalculator="deadline"
      yearControl={<span className="field-label">靜態規則集</span>}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
