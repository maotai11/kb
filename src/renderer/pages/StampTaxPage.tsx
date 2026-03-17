import { useState } from 'react';
import type {
  StampTaxCalculationInput,
  StampTaxCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const certificateOptions: Array<{
  value: StampTaxCalculationInput['certificateType'];
  label: string;
}> = [
  { value: 'cashReceipt', label: '銀錢收據' },
  { value: 'contract', label: '承攬契約' },
  { value: 'realEstate', label: '典賣/讓受不動產契約' },
  { value: 'loan', label: '消費借貸契約' }
];

const initialInput: StampTaxCalculationInput = {
  certificateType: 'contract',
  amount: 1_000_000
};

export function StampTaxPage() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<StampTaxCalculationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output = await window.firmAPI.calc.stamp(input);
      setResult(output);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : '無法計算印花稅，請稍後再試。'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const yearControl = <span className="field-label">Stamp tax lookup</span>;

  return (
    <CalcPageLayout
      title="印花稅計算"
      subtitle="依憑證類別套用固定千分率，四種常見比例涵蓋營運/金流/房地/借貸。"
      yearControl={yearControl}
      inputPanel={
        <form className="calc-form" onSubmit={handleSubmit}>
          <div className="field-grid field-grid-single">
            <label className="field">
              <span className="field-label">憑證類型</span>
              <select
                value={input.certificateType}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    certificateType: event.target.value as StampTaxCalculationInput['certificateType']
                  }))
                }
              >
                {certificateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">計算金額 (新台幣)</span>
              <input
                type="number"
                min={0}
                value={input.amount}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    amount: Number(event.target.value) || 0
                  }))
                }
              />
            </label>
          </div>
          <SectionWarning
            severity="info"
            message="稅率固定在 0.1‰、0.4‰、1‰，系統僅四種憑證可查，請以實際契約類型選擇。"
          />
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? '計算中…' : '計算印花稅'}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      }
      resultPanel={
        <div className="result-stack">
          {result ? (
            <>
              <div className="result-grid">
                <CalcResultCard label="憑證" value={result.certificateLabel} />
                <CalcResultCard
                  label="稅率"
                  value={`${result.ratePerThousand.toFixed(2)}‰`}
                  tone="accent"
                />
                <CalcResultCard label="千分率" value={result.rateDecimal} />
                <CalcResultCard label="稅額 (TWD)" value={result.tax} tone="warning" />
              </div>
              <SectionWarning
                severity="info"
                message={`採用 ${result.ratePerThousand.toFixed(
                  2
                )}‰，計算基礎 ${result.amount.toLocaleString()}，稅額自動四捨五入到兩位小數。`}
              />
            </>
          ) : (
            <div className="empty-state">
              <strong>輸入後按「計算印花稅」即可快速取得金額</strong>
              <p>本計算器只處理指定憑證類別，稅率固定在表格內的千分率。</p>
            </div>
          )}
        </div>
      }
    />
  );
}
