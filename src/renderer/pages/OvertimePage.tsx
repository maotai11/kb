import { useState } from 'react';
import type { OvertimeCalculationInput, OvertimeCalculationResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const initialInput: OvertimeCalculationInput = {
  dayType: 'rest_day',
  monthlySalary: 36_000,
  hours: 3
};

export function OvertimePage() {
  const [input, setInput] = useState<OvertimeCalculationInput>(initialInput);
  const [result, setResult] = useState<OvertimeCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: OvertimeCalculationResult = await window.firmAPI.calc.overtime(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '加班費試算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">日別</span>
          <select
            value={input.dayType}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                dayType: event.target.value as OvertimeCalculationInput['dayType']
              }))
            }
          >
            <option value="weekday">平日</option>
            <option value="rest_day">休息日</option>
            <option value="holiday">例假日 / 國定假日</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">月薪</span>
          <input
            type="number"
            min={0}
            value={input.monthlySalary}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                monthlySalary: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">加班時數</span>
          <input
            type="number"
            min={0}
            value={input.hours}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                hours: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message="休息日只有兩段：前 2 小時 × 4/3，之後全部 × 5/3，沒有第三段。例假日 / 國定假日目前先按全部 × 2 試算。"
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
        <CalcResultCard label="基礎時薪" value={Math.round(result.baseHourlyWage)} />
        <CalcResultCard label="第一段時數" value={result.tier1Hours} />
        <CalcResultCard label="第二段時數" value={result.tier2Hours} />
        <CalcResultCard label="加班費" value={result.overtimePay} tone="accent" />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>分段結果</strong>
          <span>{result.note}</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="第一段倍數" value={result.tier1Multiplier} />
          <CalcResultCard label="第一段金額" value={result.tier1Pay} />
          <CalcResultCard label="第二段倍數" value={result.tier2Multiplier} />
          <CalcResultCard label="第二段金額" value={result.tier2Pay} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先選日別、月薪與加班時數。</strong>
      <p>這頁先鎖住平日 / 休息日 / 例假日三種規則，以及休息日無第三段。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="加班費試算"
      subtitle="目前以月薪制 `月薪 / 30 / 8` 作為基礎時薪。休息日永遠只有兩段，沒有第三段。"
      historyCalculator="overtime"
      yearControl={<span className="field-label">靜態勞基法規則</span>}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
