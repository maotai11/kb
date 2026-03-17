import { useMemo, useState } from 'react';
import type {
  ResidencyCalculationInput,
  ResidencyCalculationResult,
  ResidencyStayInput
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialStay: ResidencyStayInput = {
  entryDate: '2025-01-01',
  departureDate: '2025-01-02'
};

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateText: string, days: number): string {
  const normalized = dateText || initialStay.entryDate;
  const date = parseDate(normalized);
  if (Number.isNaN(date.getTime())) {
    return initialStay.entryDate;
  }
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function buildStay(afterDate?: string): ResidencyStayInput {
  const entryDate = afterDate ? addDays(afterDate, 1) : initialStay.entryDate;
  return {
    entryDate,
    departureDate: addDays(entryDate, 1)
  };
}

export function ResidencyPage() {
  const [mode, setMode] = useState<ResidencyCalculationInput['mode']>('calendar_year');
  const [taxYear, setTaxYear] = useState(115);
  const [referenceDate, setReferenceDate] = useState('2026-03-15');
  const [stays, setStays] = useState<ResidencyStayInput[]>([initialStay]);
  const [result, setResult] = useState<ResidencyCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formInput: ResidencyCalculationInput = useMemo(() => {
    const base: ResidencyCalculationInput = {
      mode,
      stays
    };

    if (mode === 'calendar_year') {
      return { ...base, taxYear };
    }

    return { ...base, referenceDate };
  }, [mode, stays, taxYear, referenceDate]);

  function updateStay(index: number, patch: Partial<ResidencyStayInput>) {
    setStays((current) =>
      current.map((stay, idx) => (idx === index ? { ...stay, ...patch } : stay))
    );
  }

  function addStay() {
    setStays((current) => [...current, buildStay(current[current.length - 1]?.departureDate)]);
  }

  function removeStay(index: number) {
    setStays((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output = await window.firmAPI.calc.residency(formInput);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Residency calculation failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const residentText = result?.isResident ? 'Resident' : 'Non-resident';
  const yearControl =
    mode === 'calendar_year' ? (
      <YearSelector mode="income_year" value={taxYear} onChange={setTaxYear} />
    ) : (
      <span className="field-label">Rolling 12m</span>
    );

  return (
    <CalcPageLayout
      title="C-16 居留天數"
      subtitle="依照 calendar_year 與 rolling_12m 兩種模式，測算 182/183 天的判準。"
      historyCalculator="residency"
      yearControl={yearControl}
      inputPanel={
        <form className="calc-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">Mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value as ResidencyCalculationInput['mode'])}>
                <option value="calendar_year">Calendar Year</option>
                <option value="rolling_12m">Rolling 12m</option>
              </select>
            </label>

            {mode === 'rolling_12m' ? (
              <label className="field">
                <span className="field-label">Reference date</span>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(event) => setReferenceDate(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          <SectionWarning message="Departure day is excluded; add as many stays as needed and adjust the dates manually." />

          <div className="stay-list">
            {stays.map((stay, index) => (
              <div className="field-grid stay-row" key={`${stay.entryDate}-${stay.departureDate}-${index}`}>
                <label className="field">
                  <span className="field-label">Entry date</span>
                  <input
                    type="date"
                    value={stay.entryDate}
                    onChange={(event) => updateStay(index, { entryDate: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Departure date</span>
                  <input
                    type="date"
                    value={stay.departureDate}
                    onChange={(event) => updateStay(index, { departureDate: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="history-button"
                  onClick={() => removeStay(index)}
                  disabled={stays.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="submit-button" onClick={addStay}>
              + Add stay
            </button>
          </div>

          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? '計算中...' : '計算居留天數'}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      }
      resultPanel={
        result ? (
          <div className="result-stack">
            <div className="result-grid">
              <CalcResultCard label="Period start" value={result.periodStart} />
              <CalcResultCard label="Period end" value={result.periodEnd} />
              <CalcResultCard label="Law basis" value={result.lawBasis} />
              <CalcResultCard label="Total days" value={result.totalDays} />
              <CalcResultCard label="Residency" value={residentText} tone={result.isResident ? 'success' : 'warning'} />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <strong>輸入 mode、year/reference 與停留日，按下計算即可看到 residency 判斷。</strong>
            <p>calendar_year 用 income_year，rolling_12m 用 reference date，出境當日不計算。</p>
          </div>
        )
      }
    />
  );
}
