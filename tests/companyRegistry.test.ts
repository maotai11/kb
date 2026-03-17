import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { searchCompanyRegistry } from '../src/main/services/companyRegistryService';

function setupDb() {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE company_registry (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      tax_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      status TEXT,
      representative TEXT,
      address TEXT,
      capital INTEGER
    );
  `);
  db.exec(`
    CREATE VIRTUAL TABLE company_registry_fts USING fts5(
      tax_id, company_name,
      content=company_registry,
      content_rowid=rowid
    );
  `);
  db.exec(`
    CREATE TRIGGER company_registry_ai AFTER INSERT ON company_registry BEGIN
      INSERT INTO company_registry_fts(rowid, tax_id, company_name)
      VALUES (new.rowid, new.tax_id, new.company_name);
    END;
  `);
  db.exec(`
    CREATE TRIGGER company_registry_ad AFTER DELETE ON company_registry BEGIN
      DELETE FROM company_registry_fts WHERE rowid = old.rowid;
    END;
  `);
  db.exec(`
    CREATE TRIGGER company_registry_au AFTER UPDATE ON company_registry BEGIN
      UPDATE company_registry_fts SET tax_id = new.tax_id, company_name = new.company_name WHERE rowid = old.rowid;
    END;
  `);
  db.prepare(
    `
      INSERT INTO company_registry (tax_id, company_name, status, representative, address, capital)
      VALUES (@taxId, @companyName, @status, @representative, @address, @capital)
    `
  ).run({
    taxId: '12345678',
    companyName: 'Acme Trading',
    status: 'active',
    representative: 'Alice',
    address: '123 Taiwan Rd',
    capital: 1_000_000
  });
  db.prepare(
    `
      INSERT INTO company_registry (tax_id, company_name, status, representative, address, capital)
      VALUES (@taxId, @companyName, @status, @representative, @address, @capital)
    `
  ).run({
    taxId: '87654321',
    companyName: 'Acme Holdings',
    status: 'active',
    representative: 'Bob',
    address: '456 Taipei Ln',
    capital: 2_000_000
  });
  return db;
}

describe('company_registry service', () => {
  it('returns the exact tax id match when query is eight digits', async () => {
    const db = setupDb();
    const results = await searchCompanyRegistry(db, '12345678');

    expect(results).toHaveLength(1);
    expect(results[0].tax_id).toBe('12345678');
  });

  it('performs FTS company name search when query is not numeric and respects rank order', async () => {
    const db = setupDb();
    const results = await searchCompanyRegistry(db, 'Acme');

    expect(results).toHaveLength(2);
    expect(results[0].company_name).toBe('Acme Trading');
    expect(results[1].company_name).toBe('Acme Holdings');
  });
});
