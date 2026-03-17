import { useState } from 'react';
import type { AmtCalculationInput, AmtCalculationResult } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { YearSelector } from '../components/YearSelector';

const initialInput: AmtCalculationInput = {
  fiscalYear: 114,
  regularTax: 260_000,
  netIncome: 7_800_000,
  overseasIncome: 1_500_000,
  insuranceDeathBenefit: 39_000_000,
  insuranceNonDeath: 300_000,
  privateFundGain: 0,
  nonCashDonation: 0,
  foreignTaxPaid: 120_000
};

type NumericField = keyof AmtCalculationInput;

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AMTPage() {
  const [input, setInput] = useState<AmtCalculationInput>(initialInput);
  const [result, setResult] = useState<AmtCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: AmtCalculationResult = await window.firmAPI.calc.amt(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'AMT 計算失敗');
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
          <span className="field-label">C-1 常規稅額</span>
          <input
            type="number"
            value={input.regularTax}
            onChange={(event) => updateNumber('regularTax', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">C-1 綜合所得淨額</span>
          <input
            type="number"
            value={input.netIncome}
            onChange={(event) => updateNumber('netIncome', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">海外所得</span>
          <input
            type="number"
            value={input.overseasIncome}
            onChange={(event) => updateNumber('overseasIncome', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">死亡給付</span>
          <input
            type="number"
            value={input.insuranceDeathBenefit}
            onChange={(event) => updateNumber('insuranceDeathBenefit', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">非死亡保險給付</span>
          <input
            type="number"
            value={input.insuranceNonDeath}
            onChange={(event) => updateNumber('insuranceNonDeath', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">私募基金交易所得</span>
          <input
            type="number"
            value={input.privateFundGain}
            onChange={(event) => updateNumber('privateFundGain', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">非現金捐贈</span>
          <input
            type="number"
            value={input.nonCashDonation}
            onChange={(event) => updateNumber('nonCashDonation', event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-label">境外已繳稅額</span>
          <input
            type="number"
            value={input.foreignTaxPaid}
            onChange={(event) => updateNumber('foreignTaxPaid', event.target.value)}
          />
        </label>
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '試算 AMT'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <div className="result-grid">
        <CalcResultCard label="AMT 基本所得額" value={result.amtBase} />
        <CalcResultCard label="AMT 稅額" value={result.amtTax} tone="accent" />
        <CalcResultCard label="常規稅額" value={result.regularTaxForAmt} />
        <CalcResultCard
          label="AMT 補稅"
          value={result.additionalAmtTax}
          tone={result.additionalAmtTax > 0 ? 'warning' : 'success'}
        />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>計入項目</strong>
          <span>死亡給付與非死亡給付分欄，海外所得採 100 萬整筆門檻。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="海外所得計入" value={result.overseasIncomeIncluded} />
          <CalcResultCard label="死亡給付計入" value={result.insuranceDeathBenefitIncluded} />
          <CalcResultCard label="非死亡給付計入" value={result.insuranceNonDeathIncluded} />
          <CalcResultCard label="私募基金計入" value={result.privateFundGainIncluded} />
        </div>
      </section>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>境外稅額扣抵</strong>
          <span>先算比例上限，再決定實際可扣抵金額。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="扣抵上限" value={result.foreignTaxCreditLimit} />
          <CalcResultCard label="實際扣抵" value={result.foreignTaxCreditUsed} />
          <CalcResultCard label="非現金捐贈計入" value={result.nonCashDonationIncluded} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>AMT 保持獨立頁面，方便後續與 C-1 串接或單獨核算。</strong>
      <p>這也是驗證 `CalcPageLayout` 不是只服務 C-1 的第二個頁面。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="基本稅額 AMT"
      subtitle="C-10 獨立頁面，保留與 C-1 分離的常規稅額與 AMT 專屬所得項目。"
      historyCalculator="amt"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
