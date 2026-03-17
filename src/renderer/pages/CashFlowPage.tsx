import { useState } from 'react';
import type {
  UndistributedEarningsInput,
  UndistributedEarningsResult,
  RentalWithholdingInput,
  RentalWithholdingResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';

const CURRENT_YEAR = new Date().getFullYear() - 1911;

export function CashFlowPage() {
  // C-3-B: 未分配盈餘稅
  const [undistInput, setUndistInput] = useState<UndistributedEarningsInput>({
    fiscalYear: CURRENT_YEAR,
    earnings: 0
  });
  const [undistResult, setUndistResult] = useState<UndistributedEarningsResult | null>(null);
  const [undistError, setUndistError] = useState<string | null>(null);
  const [undistLoading, setUndistLoading] = useState(false);

  // C-4: 租賃反推
  const [rentalInput, setRentalInput] = useState<RentalWithholdingInput>({
    netDesired: 30000,
    landlordType: 'individual',
    payerType: 'corporation'
  });
  const [rentalResult, setRentalResult] = useState<RentalWithholdingResult | null>(null);
  const [rentalError, setRentalError] = useState<string | null>(null);
  const [rentalLoading, setRentalLoading] = useState(false);

  async function handleUndistSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUndistLoading(true);
    setUndistError(null);
    try {
      const output = await window.firmAPI.calc.undistributedEarnings(undistInput);
      setUndistResult(output);
    } catch (err) {
      setUndistError(err instanceof Error ? err.message : '計算失敗，請稍後再試。');
    } finally {
      setUndistLoading(false);
    }
  }

  async function handleRentalSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRentalLoading(true);
    setRentalError(null);
    try {
      const output = await window.firmAPI.calc.rentalWithholding(rentalInput);
      setRentalResult(output);
    } catch (err) {
      setRentalError(err instanceof Error ? err.message : '計算失敗，請稍後再試。');
    } finally {
      setRentalLoading(false);
    }
  }

  return (
    <CalcPageLayout
      title="現金流相關試算"
      subtitle="C-3-B 未分配盈餘稅與 C-4 租賃反推毛額，兩項合用同一頁面。"
      yearControl={<span className="field-label">靜態規則 + 年度選擇</span>}
      inputPanel={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* C-3-B 未分配盈餘稅 */}
          <section>
            <h3 className="section-heading">C-3-B 未分配盈餘稅（5%）</h3>
            <form className="calc-form" onSubmit={handleUndistSubmit}>
              <div className="field-grid">
                <label className="field">
                  <span className="field-label">所得年度（民國）</span>
                  <input
                    type="number"
                    min={100}
                    max={200}
                    value={undistInput.fiscalYear}
                    onChange={(e) =>
                      setUndistInput((prev) => ({ ...prev, fiscalYear: Number(e.target.value) || CURRENT_YEAR }))
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">未分配盈餘金額（元）</span>
                  <input
                    type="number"
                    min={0}
                    value={undistInput.earnings}
                    onChange={(e) =>
                      setUndistInput((prev) => ({ ...prev, earnings: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
              </div>
              <SectionWarning
                severity="info"
                message="未分配盈餘稅率固定 5%，申報期限為所得年度次年 5 月。"
              />
              <button type="submit" className="submit-button" disabled={undistLoading}>
                {undistLoading ? '計算中…' : '計算未分配盈餘稅'}
              </button>
              {undistError ? <p className="form-error">{undistError}</p> : null}
            </form>
          </section>

          {/* C-4 租賃反推 */}
          <section>
            <h3 className="section-heading">C-4 租賃所得反推毛額</h3>
            <form className="calc-form" onSubmit={handleRentalSubmit}>
              <div className="field-grid">
                <label className="field">
                  <span className="field-label">房東希望收到淨額（元）</span>
                  <input
                    type="number"
                    min={0}
                    value={rentalInput.netDesired}
                    onChange={(e) =>
                      setRentalInput((prev) => ({ ...prev, netDesired: Number(e.target.value) || 0 }))
                    }
                  />
                </label>
                <label className="field">
                  <span className="field-label">房東性質</span>
                  <select
                    value={rentalInput.landlordType}
                    onChange={(e) =>
                      setRentalInput((prev) => ({
                        ...prev,
                        landlordType: e.target.value as RentalWithholdingInput['landlordType']
                      }))
                    }
                  >
                    <option value="individual">個人</option>
                    <option value="corporation">法人</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">付款方性質</span>
                  <select
                    value={rentalInput.payerType}
                    onChange={(e) =>
                      setRentalInput((prev) => ({
                        ...prev,
                        payerType: e.target.value as RentalWithholdingInput['payerType']
                      }))
                    }
                  >
                    <option value="corporation">公司</option>
                    <option value="individual">個人</option>
                  </select>
                </label>
              </div>
              <SectionWarning
                severity="info"
                message="法人房東免扣繳；個人房東扣繳 10%，健保補充保費 2.11%，未達 20,000 免扣。"
              />
              <button type="submit" className="submit-button" disabled={rentalLoading}>
                {rentalLoading ? '計算中…' : '反推毛額'}
              </button>
              {rentalError ? <p className="form-error">{rentalError}</p> : null}
            </form>
          </section>
        </div>
      }
      resultPanel={
        <div className="result-stack">
          {undistResult ? (
            <div>
              <h3 className="section-heading">未分配盈餘稅結果</h3>
              <div className="result-grid">
                <CalcResultCard label="未分配盈餘稅（5%）" value={undistResult.undistributedTax} tone="warning" />
                <CalcResultCard label="申報年度" value={undistResult.filingYear} />
                <CalcResultCard label="申報期限" value={undistResult.filingDeadline} />
              </div>
            </div>
          ) : null}

          {rentalResult ? (
            <div style={{ marginTop: undistResult ? '1.5rem' : 0 }}>
              <h3 className="section-heading">租賃反推結果</h3>
              {rentalResult.note ? (
                <SectionWarning severity="info" message={rentalResult.note} />
              ) : null}
              {(rentalResult.gross != null || rentalResult.withholding > 0) ? (
                <div className="result-grid">
                  {rentalResult.gross != null ? (
                    <CalcResultCard label="應付毛額（元）" value={Math.round(rentalResult.gross)} />
                  ) : null}
                  {rentalResult.withholding > 0 ? (
                    <CalcResultCard label="應扣繳金額（元）" value={Math.round(rentalResult.withholding)} tone="warning" />
                  ) : null}
                  {rentalResult.nhi != null ? (
                    <CalcResultCard label="補充保費（元）" value={Math.round(rentalResult.nhi)} tone="accent" />
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!undistResult && !rentalResult ? (
            <div className="empty-state">
              <strong>選擇上方任一計算器，填入數值後送出</strong>
              <p>C-3-B 及 C-4 結果各自獨立顯示，互不干擾。</p>
            </div>
          ) : null}
        </div>
      }
    />
  );
}
