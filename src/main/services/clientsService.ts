import type Database from 'better-sqlite3';
import type {
  ClientCreateInput,
  ClientRow,
  ClientUpdateInput
} from '../../shared/ipc-types';

export function listClients(db: Database.Database): ClientRow[] {
  return db
    .prepare(`
      SELECT *
      FROM clients
      WHERE is_active = 1
      ORDER BY created_at DESC
    `)
    .all() as ClientRow[];
}

export function createClient(db: Database.Database, data: ClientCreateInput): ClientRow {
  const stmt = db.prepare(`
    INSERT INTO clients (tax_id, client_name, client_type, fiscal_year_end, notes)
    VALUES (@taxId, @clientName, @clientType, @fiscalYearEnd, @notes)
  `);
  const info = stmt.run({
    taxId: data.taxId,
    clientName: data.clientName,
    clientType: data.clientType ?? null,
    fiscalYearEnd: data.fiscalYearEnd ?? null,
    notes: data.notes ?? null
  });

  return db
    .prepare('SELECT * FROM clients WHERE client_id = ?')
    .get(info.lastInsertRowid) as ClientRow;
}

export function updateClient(
  db: Database.Database,
  clientId: number,
  data: ClientUpdateInput
): ClientRow {
  const stmt = db.prepare(`
    UPDATE clients
    SET tax_id = @taxId,
        client_name = @clientName,
        client_type = @clientType,
        fiscal_year_end = @fiscalYearEnd,
        notes = @notes
    WHERE client_id = @clientId
  `);

  stmt.run({
    clientId,
    taxId: data.taxId,
    clientName: data.clientName,
    clientType: data.clientType ?? null,
    fiscalYearEnd: data.fiscalYearEnd ?? null,
    notes: data.notes ?? null
  });

  return db
    .prepare('SELECT * FROM clients WHERE client_id = ?')
    .get(clientId) as ClientRow;
}

export function deleteClient(db: Database.Database, clientId: number): void {
  db.prepare('UPDATE clients SET is_active = 0 WHERE client_id = ?').run(clientId);
}
