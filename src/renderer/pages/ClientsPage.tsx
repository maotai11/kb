import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ClientRow, ClientCreateInput } from '../../shared/ipc-types';
import { CalcPageLayout } from '../components/CalcPageLayout';
import { SectionWarning } from '../components/SectionWarning';

type ClientsFormState = {
  taxId: string;
  clientName: string;
  clientType: string;
  fiscalYearEnd: string;
  notes: string;
};

const CLIENT_TYPES = [
  { value: 'individual', label: 'Natural person' },
  { value: 'corporation', label: 'Corporation' }
];

const initialForm: ClientsFormState = {
  taxId: '',
  clientName: '',
  clientType: 'individual',
  fiscalYearEnd: '',
  notes: ''
};

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [formState, setFormState] = useState<ClientsFormState>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = useMemo(
    () => formState.taxId.trim() !== '' && formState.clientName.trim() !== '',
    [formState]
  );

  useEffect(() => {
    refreshList();
  }, []);

  async function refreshList() {
    const rows = await window.firmAPI.clients.list();
    setClients(rows);
  }

  function resetForm() {
    setFormState(initialForm);
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFormValid) {
      setError('Tax ID and client name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: ClientCreateInput = {
      taxId: formState.taxId,
      clientName: formState.clientName,
      clientType: formState.clientType,
      fiscalYearEnd: formState.fiscalYearEnd || null,
      notes: formState.notes || null
    };

    try {
      if (editingId === null) {
        await window.firmAPI.clients.create(payload);
      } else {
        await window.firmAPI.clients.update(editingId, payload);
      }

      await refreshList();
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(client: ClientRow) {
    setEditingId(client.client_id);
    setFormState({
      taxId: client.tax_id,
      clientName: client.client_name,
      clientType: client.client_type ?? 'individual',
      fiscalYearEnd: client.fiscal_year_end ?? '',
      notes: client.notes ?? ''
    });
  }

  async function handleDelete(clientId: number) {
    try {
      await window.firmAPI.clients.delete(clientId);
      if (editingId === clientId) {
        resetForm();
      }
      await refreshList();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    }
  }

  const resultPanel = (
    <div className="result-stack">
      <div className="clients-table">
        <div className="clients-table__head">
          <span>Tax ID</span>
          <span>Client name</span>
          <span>Type</span>
          <span>Fiscal Year End</span>
          <span>Notes</span>
          <span>Actions</span>
        </div>
        {clients.length ? (
          clients.map((client) => (
            <div key={client.client_id} className="clients-table__row">
              <span>{client.tax_id}</span>
              <span>{client.client_name}</span>
              <span>{client.client_type ?? '—'}</span>
              <span>{client.fiscal_year_end ?? '—'}</span>
              <span>{client.notes ?? '—'}</span>
              <span className="clients-table__actions">
                <button type="button" onClick={() => handleEdit(client)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(client.client_id)}>
                  Delete
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <strong>No clients yet.</strong>
            <p>Use the form to seed your first client record.</p>
          </div>
        )}
      </div>
    </div>
  );

  const inputPanel = (
    <form className="calc-form" onSubmit={handleSubmit}>
      <SectionWarning severity="info" message="Records are stored locally; changes stay on this machine." />
      <div className="field-grid">
        <label className="field">
          <span className="field-label">Tax ID</span>
          <input
            value={formState.taxId}
            onChange={(event) => setFormState((current) => ({ ...current, taxId: event.target.value }))}
          />
        </label>
        <label className="field">
          <span className="field-label">Client name</span>
          <input
            value={formState.clientName}
            onChange={(event) => setFormState((current) => ({ ...current, clientName: event.target.value }))}
          />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span className="field-label">Client type</span>
          <select
            value={formState.clientType}
            onChange={(event) => setFormState((current) => ({ ...current, clientType: event.target.value }))}
          >
            {CLIENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Fiscal year end</span>
          <input
            type="date"
            value={formState.fiscalYearEnd}
            onChange={(event) => setFormState((current) => ({ ...current, fiscalYearEnd: event.target.value }))}
          />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea
          rows={3}
          value={formState.notes}
          onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
        />
      </label>
      <div className="field-actions">
        <button type="submit" className="submit-button" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? 'Saving…' : editingId === null ? 'Create client' : 'Update client'}
        </button>
        {editingId !== null ? (
          <button type="button" className="ghost-button" onClick={resetForm}>
            Cancel
          </button>
        ) : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );

  return (
    <CalcPageLayout
      title="客戶管理"
      subtitle="管理客戶統一編號、名稱與會計年度結束月份，資料儲存於本機。"
      yearControl={<span className="field-label">新增 / 編輯</span>}
      inputPanel={inputPanel}
      resultPanel={resultPanel}
      historyActionLabel="歷史記錄"
    />
  );
}
