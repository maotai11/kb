import { useState } from 'react';
import type {
  HouseLandTaxCalculationInput,
  HouseLandTaxCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const initialInput: HouseLandTaxCalculationInput = {
  acquisitionMethod: 'self_built',
  landAcquisitionDate: '2020-01-01',
  usageLicenseDate: '2021-06-01',
  saleDate: '2026-06-01',
  profitAmount: 10_000_000,
  selfUseEligible: false
};

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%`;
}

export function HouseLandTaxPage() {
  const [input, setInput] = useState<HouseLandTaxCalculationInput>(initialInput);
  const [result, setResult] = useState<HouseLandTaxCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: HouseLandTaxCalculationResult = await window.firmAPI.calc.houseLandTax(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '房地合一試算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

  const needsSingleAcquisitionDate = input.acquisitionMethod !== 'self_built';

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">取得方式</span>
          <select
            value={input.acquisitionMethod}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                acquisitionMethod: event.target.value as HouseLandTaxCalculationInput['acquisitionMethod']
              }))
            }
          >
            <option value="purchase">買入</option>
            <option value="presale">預售屋</option>
            <option value="self_built">自地自建</option>
            <option value="inheritance">繼承</option>
            <option value="gift">贈與</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">出售日期</span>
          <input
            type="date"
            value={input.saleDate}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                saleDate: event.target.value
              }))
            }
          />
        </label>
      </div>

      {needsSingleAcquisitionDate ? (
        <div className="field-grid">
          <label className="field">
            <span className="field-label">取得日期</span>
            <input
              type="date"
              value={input.acquisitionDate ?? ''}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  acquisitionDate: event.target.value
                }))
              }
            />
          </label>
        </div>
      ) : (
        <div className="field-grid">
          <label className="field">
            <span className="field-label">土地取得日</span>
            <input
              type="date"
              value={input.landAcquisitionDate ?? ''}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  landAcquisitionDate: event.target.value
                }))
              }
            />
          </label>
          <label className="field">
            <span className="field-label">使用執照日</span>
            <input
              type="date"
              value={input.usageLicenseDate ?? ''}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  usageLicenseDate: event.target.value
                }))
              }
            />
          </label>
        </div>
      )}

      <div className="field-grid">
        <label className="field">
          <span className="field-label">交易所得</span>
          <input
            type="number"
            min={0}
            value={input.profitAmount}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                profitAmount: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field toggle-field">
          <input
            type="checkbox"
            checked={input.selfUseEligible === true}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                selfUseEligible: event.target.checked
              }))
            }
          />
          <span className="field-label">符合自用住宅 10% / 首 400 萬免稅</span>
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span className="field-label">重購新屋日期</span>
          <input
            type="date"
            value={input.replacementPurchaseDate ?? ''}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                replacementPurchaseDate: event.target.value
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">舊屋售價</span>
          <input
            type="number"
            min={0}
            value={input.oldSalePrice ?? 0}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                oldSalePrice: Number(event.target.value) || 0
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">新屋買價</span>
          <input
            type="number"
            min={0}
            value={input.newPurchasePrice ?? 0}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                newPurchasePrice: Number(event.target.value) || 0
              }))
            }
          />
        </label>
      </div>

      <SectionWarning
        severity="info"
        message="自地自建持有起算日取土地取得日與使用執照日的較晚者。重購 2 年期限採加 2 年，不用 730 天。"
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
        <CalcResultCard label="持有起算日" value={result.holdStartDate} />
        <CalcResultCard label="持有期間" value={`${result.holdYears} 年 ${result.holdMonths} 月`} />
        <CalcResultCard label="適用稅率" value={formatRate(result.rate)} />
        <CalcResultCard label="應納稅額" value={result.taxPayable} tone="accent" />
      </div>

      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>課稅基礎</strong>
          <span>
            {result.selfUseApplied
              ? '已套用自用住宅 10% 與首 400 萬免稅。'
              : '依持有期間四段稅率試算。'}
          </span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="課稅所得" value={result.taxableGain} />
          <CalcResultCard label="重購期限" value={result.repurchase.deadline ?? '未輸入'} />
          <CalcResultCard
            label="重購是否在期限內"
            value={result.repurchase.withinTwoYears ? '是' : '否'}
          />
          <CalcResultCard label="退稅金額" value={result.repurchase.refundAmount} />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先輸入取得方式、日期與交易所得。</strong>
      <p>這頁目前優先驗證持有起算日、四段稅率、自用住宅與重購 2 年期限。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="房地合一 2.0 試算"
      subtitle="目前先鎖住取得方式、持有期間、四段稅率與重購 2 年期限。較複雜的爭議情境之後再補。"
      historyCalculator="house-land-tax"
      yearControl={<span className="field-label">靜態房地合一規則</span>}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
