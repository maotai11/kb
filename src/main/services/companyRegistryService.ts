import type Database from 'better-sqlite3';
import type { CompanyRegistryRow } from '../../shared/ipc-types';

export function searchCompanyRegistry(
  db: Database.Database,
  query: string
): CompanyRegistryRow[] {
  const sanitized = query.trim();
  const isExactTaxId = /^\d{8}$/.test(sanitized);

  if (isExactTaxId) {
    return db
      .prepare(`
        SELECT rowid, tax_id, company_name, status, representative, address, capital
        FROM company_registry
        WHERE tax_id = ?
      `)
      .all(sanitized) as CompanyRegistryRow[];
  }

  return db
    .prepare(`
      SELECT c.rowid, c.tax_id, c.company_name, c.status, c.representative, c.address, c.capital
      FROM company_registry c
      JOIN company_registry_fts fts ON c.rowid = fts.rowid
      WHERE company_registry_fts MATCH ?
      ORDER BY rank
      LIMIT 20
    `)
    .all(sanitized) as CompanyRegistryRow[];
}
