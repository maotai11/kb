import { useState } from 'react';
import type { PayrollCalculationInput, PayrollCalculationResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialInput: PayrollCalculationInput = {
  fiscalYear: 115,
  salary: 52_000,
  dependentsCount: 1,
  occupationalAccidentRate: 0.0011,
  voluntaryPensionRate: 0.06
};

function warningText(label: string, salary: number, cap: number): string | null {
  if (salary <= cap) {
    return null;
  }

  return `月薪超過 ${cap.toLocaleString('zh-TW')}，${label} 以 ${cap.toLocaleString('zh-TW')} 計算。`;
}

export function PayrollPage() {
  const [input, setInput] = useState<PayrollCalculationInput>(initialInput);
  const [result, setResult] = useState<PayrollCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: PayrollCalculationResult = await window.firmAPI.calc.payroll(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '薪資費用試算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const laborWarning = result
    ? warningText('勞保', input.salary, result.insuredSalaries.laborIns)
    : null;
  const nhiWarning =
    result && result.insuredSalaries.nhi >= 219_500
      ? warningText('健保', input.salary, result.insuredSalaries.nhi)
      : null;
  const pensionWarning =
    result && result.insuredSalaries.pension >= 150_000
      ? warningText('勞退', input.salary, result.insuredSalaries.pension)
      : null;

  const yearControl = (
    <YearSelector
      mode="effective_year"
      value={input.fiscalYear}
      years={[115, 114]}
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
          <span className="field-label">月薪</span>
          <input
            type="number"
            value={input.salary}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                salary: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">眷屬人數</span>
          <input
            type="number"
            min="0"
            value={input.dependentsCount}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                dependentsCount: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">職災費率</span>
          <input
            type="number"
            step="0.0001"
            value={input.occupationalAccidentRate}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                occupationalAccidentRate: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">自提勞退比率</span>
          <input
            type="number"
            step="0.01"
            value={input.voluntaryPensionRate}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                voluntaryPensionRate: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '試算勞健保 / 勞退'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <section className="system-section">
        <div className="comparison-header">
          <strong>勞保（LABOR_INS）</strong>
          <span>使用獨立分級表，不與健保或勞退混用。</span>
        </div>
        {laborWarning ? <SectionWarning message={laborWarning} /> : null}
        <div className="result-grid">
          <CalcResultCard label="投保薪資" value={result.insuredSalaries.laborIns} />
          <CalcResultCard label="員工負擔" value={result.employeeContribution.laborInsurance} />
          <CalcResultCard label="雇主負擔" value={result.employerContribution.laborInsurance} />
          <CalcResultCard label="職災保險" value={result.employerContribution.occupationalAccident} />
        </div>
      </section>

      <section className="system-section">
        <div className="comparison-header">
          <strong>健保（NHI）</strong>
          <span>雇主負擔與眷屬平均人數分開列示。</span>
        </div>
        {nhiWarning ? <SectionWarning message={nhiWarning} /> : null}
        <div className="result-grid">
          <CalcResultCard label="投保金額" value={result.insuredSalaries.nhi} />
          <CalcResultCard label="員工負擔" value={result.employeeContribution.healthInsurance} />
          <CalcResultCard label="雇主負擔" value={result.employerContribution.healthInsurance} />
          <CalcResultCard
            label="眷屬平均負擔"
            value={result.employerContribution.healthInsuranceDependents}
          />
        </div>
      </section>

      <section className="system-section">
        <div className="comparison-header">
          <strong>勞退（PENSION）</strong>
          <span>自提與雇主強制提繳分別顯示。</span>
        </div>
        {pensionWarning ? <SectionWarning message={pensionWarning} /> : null}
        <div className="result-grid">
          <CalcResultCard label="提繳工資" value={result.insuredSalaries.pension} />
          <CalcResultCard label="員工自提" value={result.employeeContribution.pension} />
          <CalcResultCard label="雇主提繳" value={result.employerContribution.pension} />
          <CalcResultCard label="分級表版本" value={result.gradeTableVersion} hint={result.paramsVersion} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先輸入薪資與費率，再看三套表如何各自計算。</strong>
      <p>這頁用三個 section 驗證同一個 calculator layout 是否能承載多套結果與分散警示。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="勞健保 / 勞退費用試算"
      subtitle="這裡的年度是 effective_year，不是所得年度。結果區固定拆成勞保、健保、勞退三個獨立 section。"
      historyCalculator="payroll"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
