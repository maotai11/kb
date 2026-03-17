import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { migrateDatabase } from '../src/main/db/migrations';
import { importFtuPack } from '../src/main/services/ftuService';

const tempFiles: string[] = [];

function createFtuZip(manifest: Record<string, unknown>, entries: Record<string, unknown>) {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest), 'utf-8'));
  for (const [fileName, payload] of Object.entries(entries)) {
    zip.addFile(fileName, Buffer.from(JSON.stringify(payload), 'utf-8'));
  }

  const dest = join(tmpdir(), `ftu-${randomBytes(6).toString('hex')}.zip`);
  zip.writeZip(dest);
  tempFiles.push(dest);
  return dest;
}

afterEach(() => {
  while (tempFiles.length) {
    const filePath = tempFiles.pop();
    if (filePath) {
      try {
        fsUnlink(filePath);
      } catch {
        // ignore
      }
    }
  }
});

function fsUnlink(path: string) {
  try {
    fs.unlinkSync(path);
  } catch {
    // swallow
  }
}

describe('FTU pack import', () => {
  it('rejects packs that require a newer application version', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);

    const manifest = {
      version: '1.0.0',
      min_app_version: '9.9.9',
      contents: []
    };
    const packPath = createFtuZip(manifest, {});

    expect(() => importFtuPack(db, packPath, '0.1.0')).toThrow('FTU pack requires app version >= 9.9.9');
    db.close();
  });

  it('upserts yearly_params rows from the FTU pack', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);

    const manifest = {
      version: '1.0.0',
      min_app_version: '0.1.0',
      contents: [{ type: 'yearly_params', file: 'yearly_params.json' }]
    };

    const yearlyParams = [
      {
        fiscalYear: 116,
        category: 'TAX_IIT',
        paramKey: 'exemption_general',
        paramValue: 123456,
        usageContext: 'income_year',
        isConfirmed: 1
      }
    ];

    const packPath = createFtuZip(manifest, { 'yearly_params.json': yearlyParams });
    importFtuPack(db, packPath, '0.1.0');

    const row = db
      .prepare(`SELECT param_value FROM yearly_params WHERE fiscal_year = 116 AND param_key = 'exemption_general'`)
      .get();
    expect(row).toBeDefined();
    expect(row.param_value).toBe(123456);
    db.close();
  });

  it('replaces existing grade tables when import pack provides new data', () => {
    const db = new Database(':memory:');
    migrateDatabase(db);

    const insertGradeTable = db.prepare(`
      INSERT INTO grade_tables (
        fiscal_year, table_type, usage_context, version_tag, effective_date, is_confirmed, table_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertGradeTable.run(115, 'LABOR_INS', 'effective_year', 'baseline', '2026-01-01', 1, '{"version":"old"}');

    const manifest = {
      version: '1.0.1',
      min_app_version: '0.1.0',
      contents: [{ type: 'grade_tables', file: 'grade_tables.json' }]
    };

    const gradeTables = [
      {
        fiscalYear: 115,
        tableType: 'LABOR_INS',
        usageContext: 'effective_year',
        versionTag: 'updated',
        effectiveDate: '2026-01-01',
        isConfirmed: 1,
        tableJson: '{"version":"new"}'
      }
    ];

    const packPath = createFtuZip(manifest, { 'grade_tables.json': gradeTables });
    importFtuPack(db, packPath, '0.1.0');

    const row = db
      .prepare(`SELECT version_tag, table_json FROM grade_tables WHERE fiscal_year = 115 AND table_type = 'LABOR_INS'`)
      .get();
    expect(row.version_tag).toBe('updated');
    expect(row.table_json).toBe('{"version":"new"}');
    db.close();
  });
});
