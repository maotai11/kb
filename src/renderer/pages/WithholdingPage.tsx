import { useEffect, useState } from 'react';
import type {
  DbParamsRequest,
  WithholdingCalculationInput,
  WithholdingCalculationResult
} from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { CalcResultCard } from '../components/CalcResultCard';
import { SectionWarning } from '../components/SectionWarning';
import { YearSelector } from '../components/YearSelector';

const initialInput: WithholdingCalculationInput = {
  fiscalYear: 115,
  incomeType: 'salary',
  payerType: 'individual',
  recipientResidency: 'nonresident',
  amount: 44_250
};

const incomeTypeOptions: Array<{
  value: WithholdingCalculationInput['incomeType'];
  label: string;
}> = [
  { value: 'salary', label: '薪資' },
  { value: 'service_fee', label: '執行業務 / 佣金' },
  { value: 'interest', label: '利息' },
  { value: 'rent', label: '租金' },
  { value: 'dividend', label: '股利' },
  { value: 'other', label: '其他' }
];

function formatRate(rate: number): string {
  return `${(rate * 100).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%`;
}

export function WithholdingPage() {
  const [input, setInput] = useState<WithholdingCalculationInput>(initialInput);
  const [result, setResult] = useState<WithholdingCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salaryHint, setSalaryHint] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function loadHint() {
      const request: DbParamsRequest = {
        fiscalYear: input.fiscalYear,
        category: 'WITHHOLD_NRA',
        usageContext: 'effective_year'
      };

      const params = await window.firmAPI.db.getParams(request);
      if (!active) {
        return;
      }

      const threshold = Number(params.nra_salary_threshold ?? 0);
      const lowRate = Number(params.nra_salary_rate_low ?? 0);
      const highRate = Number(params.nra_salary_rate_high ?? 0);

      setSalaryHint(
        `${input.fiscalYear}年門檻：${threshold.toLocaleString('zh-TW')} 元｜低於門檻 ${formatRate(lowRate)}，高於門檻 ${formatRate(highRate)}`
      );
    }

    loadHint().catch(() => {
      if (active) {
        setSalaryHint('');
      }
    });

    return () => {
      active = false;
    };
  }, [input.fiscalYear]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const output: WithholdingCalculationResult = await window.firmAPI.calc.withholding(input);
      setResult(output);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '扣繳計算失敗');
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <span className="field-label">所得類型</span>
          <select
            value={input.incomeType}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                incomeType: event.target.value as WithholdingCalculationInput['incomeType'],
                landlordType:
                  event.target.value === 'rent' ? current.landlordType ?? 'individual' : undefined
              }))
            }
          >
            {incomeTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">收款人身分</span>
          <select
            value={input.recipientResidency}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                recipientResidency: event.target.value as 'resident' | 'nonresident'
              }))
            }
          >
            <option value="nonresident">非居住者</option>
            <option value="resident">居住者</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">付款人類型</span>
          <select
            value={input.payerType}
            onChange={(event) =>
              setInput((current) => ({
                ...current,
                payerType: event.target.value as 'individual' | 'corporation'
              }))
            }
          >
            <option value="individual">自然人</option>
            <option value="corporation">法人</option>
          </select>
        </label>

        <label className="field">
          <span className="field-label">給付金額</span>
          <input
            type="number"
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

      {input.incomeType === 'rent' ? (
        <section className="subsection">
          <div className="subsection-heading">
            <strong>租金附加條件</strong>
            <span>只有租金類型才需要判斷房東身分。</span>
          </div>
          <label className="field">
            <span className="field-label">房東類型</span>
            <select
              value={input.landlordType ?? 'individual'}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  landlordType: event.target.value as 'individual' | 'corporation'
                }))
              }
            >
              <option value="individual">自然人</option>
              <option value="corporation">法人（免扣繳）</option>
            </select>
          </label>
        </section>
      ) : null}

      {input.incomeType === 'salary' && salaryHint ? (
        <SectionWarning message={salaryHint} severity="info" />
      ) : null}

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? '計算中…' : '試算扣繳'}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  const resultPanel = result ? (
    <div className="result-stack">
      <section className="comparison-panel">
        <div className="comparison-header">
          <strong>扣繳結果</strong>
          <span>結果同步顯示金額、稅率與適用原因，方便查核。</span>
        </div>
        <div className="result-grid">
          <CalcResultCard label="扣繳稅額" value={result.withholding} tone="accent" />
          <CalcResultCard label="適用稅率" value={formatRate(result.taxRate)} />
          <CalcResultCard
            label="原因"
            value={result.note}
            tone={result.taxRate === 0 ? 'success' : 'default'}
          />
          <CalcResultCard
            label="所得類型"
            value={
              incomeTypeOptions.find((option) => option.value === result.incomeType)?.label ??
              result.incomeType
            }
            hint={input.recipientResidency === 'nonresident' ? '非居住者規則' : '居住者規則'}
          />
        </div>
      </section>
    </div>
  ) : (
    <div className="empty-state">
      <strong>先選所得類型，再讓表單只顯示必要欄位。</strong>
      <p>這頁用動態欄位驗證 calculator 骨架是否能承載條件式輸入，而不是把所有情境一次攤平。</p>
    </div>
  );

  return (
    <CalcPageLayout
      title="各類所得扣繳試算"
      subtitle="先處理非居住者與租金房東例外。表單會隨 incomeType 收斂欄位，結果區同步顯示稅率與原因。"
      historyCalculator="withholding"
      yearControl={yearControl}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
    />
  );
}
