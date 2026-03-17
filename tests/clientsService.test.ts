import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { createClient, deleteClient, listClients, updateClient } from '../src/main/services/clientsService';

describe('clients service', () => {
  let db: Database.Database;

  afterEach(() => {
    db?.close();
  });

  function setupDb() {
    db = new Database(':memory:');
    migrateDatabase(db);
  }

  it('returns the newly created client in list', () => {
    setupDb();

    createClient(db, {
      taxId: '12345678',
      clientName: 'Acme Corp',
      clientType: 'corporation',
      fiscalYearEnd: '2026-12-31',
      notes: 'Test entry'
    });

    const rows = listClients(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].tax_id).toBe('12345678');
    expect(rows[0].client_name).toBe('Acme Corp');
  });

  it('update modifies the stored client record', () => {
    setupDb();

    const created = createClient(db, {
      taxId: '12345678',
      clientName: 'Acme Corp',
      clientType: 'corporation',
      fiscalYearEnd: '2026-12-31',
      notes: 'Initial'
    });

    const updated = updateClient(db, created.client_id, {
      taxId: '87654321',
      clientName: 'Updated LLC',
      clientType: 'individual',
      fiscalYearEnd: '2025-03-31',
      notes: 'Updated notes'
    });

    expect(updated.tax_id).toBe('87654321');
    expect(updated.client_name).toBe('Updated LLC');

    const rows = listClients(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].tax_id).toBe('87654321');
    expect(rows[0].client_name).toBe('Updated LLC');
  });

  it('delete soft removes the client from list', () => {
    setupDb();

    const created = createClient(db, {
      taxId: '12345678',
      clientName: 'Acme Corp',
      clientType: 'corporation',
      fiscalYearEnd: '2026-12-31',
      notes: 'Initial'
    });

    deleteClient(db, created.client_id);

    const rows = listClients(db);
    expect(rows).toHaveLength(0);
  });
});
