import type Database from 'better-sqlite3';
import https from 'node:https';
import type { CompanyRegistryRow } from '../../shared/ipc-types';

const GCIS_API =
  'https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6';

type GcisRecord = {
  Business_Accounting_NO: string;
  Company_Name: string;
  Company_Status_Desc: string;
  Responsible_Name: string;
  Company_Location: string;
  Capital_Stock_Amount: number | null;
};

function fetchGcis(filter: string): Promise<GcisRecord[]> {
  return new Promise((resolve, reject) => {
    const url = `${GCIS_API}?$format=json&$top=20&$filter=${encodeURIComponent(filter)}`;
    https
      .get(url, { timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(Array.isArray(parsed) ? parsed : []);
          } catch {
            resolve([]);
          }
        });
      })
      .on('error', () => resolve([]))
      .on('timeout', () => resolve([]));
  });
}

function gcisToRow(r: GcisRecord): CompanyRegistryRow {
  return {
    rowid: 0,
    tax_id: r.Business_Accounting_NO,
    company_name: r.Company_Name,
    status: r.Company_Status_Desc || null,
    representative: r.Responsible_Name || null,
    address: r.Company_Location || null,
    capital: r.Capital_Stock_Amount ?? null,
  };
}

function upsertCache(db: Database.Database, rows: CompanyRegistryRow[]): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO company_registry (tax_id, company_name, status, representative, address, capital)
    VALUES (@tax_id, @company_name, @status, @representative, @address, @capital)
  `);
  const run = db.transaction(() => { for (const r of rows) stmt.run(r); });
  run();
}

function localSearch(db: Database.Database, query: string): CompanyRegistryRow[] {
  const isExactTaxId = /^\d{8}$/.test(query);
  if (isExactTaxId) {
    return db.prepare(`
      SELECT rowid, tax_id, company_name, status, representative, address, capital
      FROM company_registry WHERE tax_id = ?
    `).all(query) as CompanyRegistryRow[];
  }
  try {
    return db.prepare(`
      SELECT c.rowid, c.tax_id, c.company_name, c.status, c.representative, c.address, c.capital
      FROM company_registry c
      JOIN company_registry_fts fts ON c.rowid = fts.rowid
      WHERE company_registry_fts MATCH ?
      ORDER BY rank LIMIT 20
    `).all(query) as CompanyRegistryRow[];
  } catch {
    return [];
  }
}

export async function searchCompanyRegistry(
  db: Database.Database,
  query: string
): Promise<CompanyRegistryRow[]> {
  const sanitized = query.trim();
  const isExactTaxId = /^\d{8}$/.test(sanitized);

  // 1. Try local cache first
  const cached = localSearch(db, sanitized);
  if (cached.length > 0) return cached;

  // 2. No local results — try GCIS live API
  const filter = isExactTaxId
    ? `Business_Accounting_NO eq '${sanitized}'`
    : `Company_Name like '${sanitized}'`;

  const gcisRows = await fetchGcis(filter);
  if (gcisRows.length === 0) return [];

  const rows = gcisRows.map(gcisToRow);
  upsertCache(db, rows);
  return localSearch(db, sanitized);
}
