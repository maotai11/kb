import { FormEvent, useEffect, useState } from 'react';
import type { ScheduleCreateInput, ScheduleRow } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { SectionWarning } from '../components/SectionWarning';

const CALCULATOR_OPTIONS = [
  { value: 'cit', label: 'C-3 營所稅' },
  { value: 'iit', label: 'C-1 綜所稅' },
  { value: 'withholding', label: 'C-5 扣繳申報' },
  { value: 'payroll', label: 'C-7 勞健保' },
  { value: 'nhi-supplement', label: 'C-8 補充保費' },
  { value: 'undistributed-earnings', label: 'C-3-B 未分配盈餘' },
  { value: 'house-land-tax', label: 'C-11 房地合一' },
  { value: 'house-tax', label: '房屋稅' },
  { value: 'land-value-tax', label: 'C-15 地價稅' },
  { value: 'stamp', label: '印花稅' },
  { value: 'estate-gift-tax', label: 'C-14 遺贈稅' },
  { value: 'other', label: '其他' }
];

const CALC_LABEL = new Map(CALCULATOR_OPTIONS.map((o) => [o.value, o.label]));

function ScheduleTable({
  rows,
  heading,
  isDone,
  onToggleDone,
  onDelete,
}: {
  rows: ScheduleRow[];
  heading: string;
  isDone: boolean;
  onToggleDone: (row: ScheduleRow) => void;
  onDelete: (id: number) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div style={isDone ? { marginTop: '1.5rem' } : undefined}>
      <h3 className="section-heading">{heading}（{rows.length}）</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>類別</th><th>法定日</th><th>順延後</th><th>備注</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.schedule_id} style={isDone ? { opacity: 0.6 } : undefined}>
              <td>{CALC_LABEL.get(row.calculator) ?? row.calculator}</td>
              <td>{row.raw_deadline}</td>
              <td className={isDone ? undefined : 'text-accent'}>{row.adjusted_deadline ?? row.raw_deadline}</td>
              <td>{row.notes ?? '—'}</td>
              <td>
                <button type="button" className="page-chip" onClick={() => onToggleDone(row)}>
                  {isDone ? '復原' : '完成'}
                </button>
                <button
                  type="button"
                  className="page-chip"
                  style={{ marginLeft: '0.4rem' }}
                  onClick={() => onDelete(row.schedule_id)}
                >
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const initialForm: ScheduleCreateInput = {
  clientId: null,
  calculator: 'cit',
  rawDeadline: '',
  notes: ''
};

export function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [form, setForm] = useState<ScheduleCreateInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshList();
  }, []);

  async function refreshList() {
    const rows = await window.firmAPI.schedule.list();
    setSchedules(rows);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.rawDeadline.trim()) {
      setError('請輸入申報截止日（格式：YYYY-MM-DD）。');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.rawDeadline.trim())) {
      setError('日期格式錯誤，請使用 YYYY-MM-DD（例：2025-05-31）。');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await window.firmAPI.schedule.create(form);
      setForm(initialForm);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleDone(row: ScheduleRow) {
    await window.firmAPI.schedule.update(row.schedule_id, { isDone: row.is_done === 0 });
    await refreshList();
  }

  async function handleDelete(scheduleId: number) {
    await window.firmAPI.schedule.delete(scheduleId);
    await refreshList();
  }

  const [pending, done] = schedules.reduce<[ScheduleRow[], ScheduleRow[]]>(
    ([p, d], s) => (s.is_done === 0 ? [[...p, s], d] : [p, [...d, s]]),
    [[], []]
  );

  return (
    <CalcPageLayout
      title="申報排程管理"
      subtitle="記錄各申報截止日，系統自動依假日調整，標記完成狀態。"
      yearControl={<span className="field-label">依 adjustDeadline() 自動順延</span>}
      inputPanel={
        <form className="calc-form" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              <span className="field-label">申報類別</span>
              <select
                value={form.calculator}
                onChange={(e) => setForm((prev) => ({ ...prev, calculator: e.target.value }))}
              >
                {CALCULATOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">法定截止日（YYYY-MM-DD）</span>
              <input
                type="date"
                value={form.rawDeadline}
                onChange={(e) => setForm((prev) => ({ ...prev, rawDeadline: e.target.value }))}
              />
            </label>
            <label className="field field-full">
              <span className="field-label">備注</span>
              <input
                type="text"
                placeholder="例：114年度結算申報"
                value={form.notes ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || null }))}
              />
            </label>
          </div>
          <SectionWarning
            severity="info"
            message="系統依現有假日資料自動計算順延日。假日表若不完整，請先更新 holidays 資料。"
          />
          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? '新增中…' : '新增排程'}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      }
      resultPanel={
        <div className="result-stack">
          {schedules.length === 0 ? (
            <div className="empty-state">
              <strong>尚無排程記錄</strong>
              <p>在左側新增申報截止日後，系統自動順延並顯示在此。</p>
            </div>
          ) : (
            <>
              <ScheduleTable rows={pending} heading="待辦" isDone={false} onToggleDone={handleToggleDone} onDelete={handleDelete} />
              <ScheduleTable rows={done} heading="已完成" isDone={true} onToggleDone={handleToggleDone} onDelete={handleDelete} />
            </>
          )}
        </div>
      }
    />
  );
}
