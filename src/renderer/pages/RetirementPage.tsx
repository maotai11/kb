import { useState } from 'react';
import type {
  RetirementCalculationInput,
  RetirementCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialInput: RetirementCalculationInput = {
  fiscalYear: 115,
  paymentType: 'lump',
  yearsOfService: 10,
  totalAmount: 2_060_001
};

function hasSuccessfulResult(
  result: RetirementCalculationResult
): result is Extract<RetirementCalculationResult, { error: null }> {
  return result.error === null;
}

export function RetirementPage() {
  const [input, setInput] = useState<RetirementCalculationInput>(initialInput);
  const [result, setResult] = useState<RetirementCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: RetirementCalculationResult = await window.firmAPI.calc.retirement(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '退職所得試算失敗');
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
      <div className="field-grid">
        <label className="field">
          <span className="field-label">給付方式</span>
          <select
            value={input.paymentType}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                paymentType: event.target.value as RetirementCalculationInput['paymentType']
              }))
            }
          >
            <option value="lump">一次領</option>
            <option value="annuity">分期領</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">年資</span>
          <input
            type="number"
            min={0}
            value={input.yearsOfService}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                yearsOfService: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <div className="field-grid field-grid-single">
        <label className="field">
          <span className="field-label">退職金總額</span>
          <input
            type="number"
            min={0}
            value={input.totalAmount}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                totalAmount: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message={
          input.paymentType === 'lump'
            ? '一次領依年資定額走三段式：免稅、半數課稅、全額課稅。'
            : '分期領需有當年度已公告之 retirement_annuity_annual；115 年尚未公告。'
        }
      />

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中...' : '開始試算'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    !hasSuccessfulResult(result) ? (
      <section className="comparison-panel">
        <SectionWarning message={result.error} />
      </section>
    ) : (
      <div className="result-stack">
        <div className="result-grid">
          <CalcResultCard label="年度免稅額" value={result.annualExempt} />
          <CalcResultCard label="第一段上限" value={result.tier1Amount} />
          <CalcResultCard label="第二段上限" value={result.tier2Amount} />
          <CalcResultCard label="應稅退職所得" value={result.taxableAmount} tone="accent" />
        </div>
        <section className="comparison-panel">
          <div className="comparison-header">
            <strong>適用區段</strong>
            <span>
              {result.appliedTier === 'tier1'
                ? '未超過第一段，全額免稅'
                : result.appliedTier === 'tier2'
                  ? '介於第一段與第二段之間，超過第一段部分半數課稅'
                  : result.appliedTier === 'tier3'
                    ? '超過第二段，第一段以上先半數課稅，再加第三段全額課稅'
                    : '分期領按年度定額免稅後，剩餘部分課稅'}
            </span>
          </div>
          <div className="result-grid">
            <CalcResultCard
              label="給付方式"
              value={result.paymentType === 'lump' ? '一次領' : '分期領'}
            />
            <CalcResultCard
              label="適用規則"
              value={result.appliedTier === 'annuity' ? '分期領年度免稅額' : `一次領 ${result.appliedTier}`}
              tone={result.appliedTier === 'tier3' ? 'warning' : 'default'}
            />
          </div>
        </section>
      </div>
    )
  ) : (
    <div className="empty-state">
      <strong>先選擇一次領或分期領，再輸入年資與退職金總額。</strong>
      <p>一次領會顯示三段式門檻；分期領若年度尚未公告，會直接提示不可試算。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="退職所得試算"
      subtitle="這裡使用 income_year 年度參數。一次領與分期領是兩套公式，115 年分期定額免稅額尚未公告時不得靜默續算。"
      historyCalculator="retirement"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
