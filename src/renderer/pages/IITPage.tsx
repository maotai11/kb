import { useState } from 'react';
import type { IitCalculationInput, IitDeductionResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { YearSelector } from '../components/YearSelector';

const initialInput: IitCalculationInput = {
  fiscalYear: 114,
  children: [],
  applyLongTermCareDeduction: false,
  testNetIncome: 0,
  testTaxRate: 0.05,
  salaryIncome: 1_200_000,
  dividendIncome: 300_000,
  withholdingCredit: 20_000,
  overseasIncome: 0,
  insuranceDeathBenefit: 0,
  insuranceNonDeath: 0,
  privateFundGain: 0,
  nonCashDonation: 0,
  foreignTaxPaid: 0,
  householdSize: 1,
  exemptionCount: 1,
  filingStatus: 'single'
};

type NumericField =
  | 'salaryIncome'
  | 'dividendIncome'
  | 'withholdingCredit'
  | 'householdSize'
  | 'exemptionCount'
  | 'overseasIncome'
  | 'insuranceDeathBenefit'
  | 'insuranceNonDeath'
  | 'privateFundGain'
  | 'nonCashDonation'
  | 'foreignTaxPaid';

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function IITPage() {
  const [input, setInput] = useState<IitCalculationInput>(initialInput);
  const [result, setResult] = useState<IitDeductionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: IitDeductionResult = await window.firmAPI.calc.iit(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '綜所稅計算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateNumber(field: NumericField, value: string) {
    setInput((current) => ({
      ...current,
      [field]: parseNumber(value)
    }));
  }

  const yearControl = (
    <YearSelector
      mode="income_year"
      value={input.fiscalYear}
      years={[114, 115]}
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
          <span className="field-label">薪資所得</span>
          <input
            type="number"
            value={input.salaryIncome ?? 0}
            onChange={(event) => updateNumber('salaryIncome', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">股利所得</span>
          <input
            type="number"
            value={input.dividendIncome ?? 0}
            onChange={(event) => updateNumber('dividendIncome', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">已扣繳稅額</span>
          <input
            type="number"
            value={input.withholdingCredit ?? 0}
            onChange={(event) => updateNumber('withholdingCredit', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">申報人口數</span>
          <input
            type="number"
            min="1"
            value={input.householdSize ?? 1}
            onChange={(event) => updateNumber('householdSize', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">免稅額人數</span>
          <input
            type="number"
            min="1"
            value={input.exemptionCount ?? 1}
            onChange={(event) => updateNumber('exemptionCount', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">申報方式</span>
          <select
            value={input.filingStatus ?? 'single'}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                filingStatus: event.target.value as 'single' | 'married'
              }))
            }
          >
            <option value="single">單身申報</option>
            <option value="married">夫妻合併申報</option>
          </select>
        </label>
      </div>

      <section className="subsection">
        <div className="subsection-heading">
          <strong>AMT 附加項目</strong>
          <span>沿用 C-10 input shape，不把欄位藏在計算器裡。</span>
        </div>
        <div className="field-grid">
          <label className="field">
            <span className="field-label">海外所得</span>
            <input
              type="number"
              value={input.overseasIncome ?? 0}
              onChange={(event) => updateNumber('overseasIncome', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">死亡給付</span>
            <input
              type="number"
              value={input.insuranceDeathBenefit ?? 0}
              onChange={(event) => updateNumber('insuranceDeathBenefit', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">非死亡保險給付</span>
            <input
              type="number"
              value={input.insuranceNonDeath ?? 0}
              onChange={(event) => updateNumber('insuranceNonDeath', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">私募基金交易所得</span>
            <input
              type="number"
              value={input.privateFundGain ?? 0}
              onChange={(event) => updateNumber('privateFundGain', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">非現金捐贈</span>
            <input
              type="number"
              value={input.nonCashDonation ?? 0}
              onChange={(event) => updateNumber('nonCashDonation', event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">境外已繳稅額</span>
            <input
              type="number"
              value={input.foreignTaxPaid ?? 0}
              onChange={(event) => updateNumber('foreignTaxPaid', event.target.value)}
            />
          </label>
        </div>
      </section>

      <label className="toggle-field">
        <input
          type="checkbox"
          checked={input.applyLongTermCareDeduction}
          onChange={(event) =>
            setInput((current) => ({
              ...current,
              applyLongTermCareDeduction: event.target.checked
            }))
          }
        />
        <span>套用長期照顧特別扣除額</span>
      </label>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '試算綜所稅'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="綜合所得淨額" value={result.taxableNetIncome} />
        <CalcResultCard label="累進稅額" value={result.progressiveTax} />
        <CalcResultCard
          label="常規稅額"
          value={result.regularTax}
          tone="accent"
          hint="已扣抵股利抵減與已扣繳稅額後"
        />
        <CalcResultCard
          label="AMT 加徵"
          value={result.amt.additionalAmtTax}
          tone={result.amt.additionalAmtTax > 0 ? 'warning' : 'success'}
        />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>股利二擇一</strong>
          <span>
            建議：
            {result.recommendedDividendMethod === 'A'
              ? '選方案A較划算'
              : '選方案B較划算'}
          </span>
        </div>
        <div className="comparison-grid">
          <CalcResultCard
            label="方案A（合併）"
            value={result.dividendMethodA.totalTax}
            tone={result.recommendedDividendMethod === 'A' ? 'success' : 'default'}
            hint={`股利抵減 ${result.dividendMethodA.dividendCredit.toLocaleString('zh-TW')} 元`}
          />
          <CalcResultCard
            label="方案B（分離）"
            value={result.dividendMethodB.totalTax}
            tone={result.recommendedDividendMethod === 'B' ? 'success' : 'default'}
            hint={`股利分開課稅 ${result.dividendMethodB.dividendFlatTax.toLocaleString('zh-TW')} 元`}
          />
        </div>
      </section>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>AMT 比較摘要</strong>
          <span>regularTax 已先 clamp 為非負數後再傳入 C-10</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="海外所得計入" value={result.amt.overseasIncomeIncluded} />
          <CalcResultCard label="死亡給付計入" value={result.amt.insuranceDeathBenefitIncluded} />
          <CalcResultCard
            label="境外扣抵上限"
            value={result.amt.foreignTaxCreditLimit}
            hint={`實際扣抵 ${result.amt.foreignTaxCreditUsed.toLocaleString('zh-TW')} 元`}
          />
          <CalcResultCard label="AMT 稅額" value={result.amt.amtTax} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先輸入所得資料再試算。</strong>
      <p>第一版先把共用骨架釘死：年度、輸入、推薦結果、AMT 摘要都會是後續 calculator 的固定結構。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="綜合所得稅試算"
      subtitle="固定以所得年度驅動 yearly_params，結果區同步呈現股利二擇一與 AMT 比較。"
      historyCalculator="iit"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
