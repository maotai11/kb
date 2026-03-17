/**
 * import-company-registry.ts
 *
 * 離線統編資料匯入工具
 * 用法：tsx scripts/import-company-registry.ts <csv-or-json-file> [--db <database-path>]
 *
 * 支援兩種來源格式：
 *   1. CSV：tax_id,company_name,status,representative,address,capital
 *   2. JSON：[{ "統一編號": "...", "公司名稱": "...", ... }, ...]
 *
 * 資料來源：政府資料開放平台
 *   https://data.gov.tw/dataset/17276  (公司登記基本資料)
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

type CompanyRow = {
  tax_id: string;
  company_name: string;
  status: string | null;
  representative: string | null;
  address: string | null;
  capital: number | null;
};

function parseCsv(content: string): CompanyRow[] {
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: CompanyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const get = (name: string): string | null => {
      const idx = header.indexOf(name);
      return idx >= 0 && cols[idx] ? cols[idx].trim() || null : null;
    };

    const taxId = get('tax_id') ?? get('統一編號') ?? get('公司統一編號');
    const companyName = get('company_name') ?? get('公司名稱') ?? get('名稱');
    if (!taxId || !companyName) continue;

    const capitalStr = get('capital') ?? get('資本額') ?? get('實收資本額');
    rows.push({
      tax_id: taxId,
      company_name: companyName,
      status: get('status') ?? get('公司狀況'),
      representative: get('representative') ?? get('代表人姓名') ?? get('負責人姓名'),
      address: get('address') ?? get('公司所在地'),
      capital: capitalStr ? parseInt(capitalStr.replace(/,/g, ''), 10) || null : null
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseJson(content: string): CompanyRow[] {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) throw new Error('JSON 根層必須是陣列');

  const rows: CompanyRow[] = [];
  for (const item of data) {
    const taxId = item['統一編號'] ?? item['tax_id'] ?? item['公司統一編號'];
    const companyName = item['公司名稱'] ?? item['company_name'] ?? item['名稱'];
    if (!taxId || !companyName) continue;

    const capitalVal = item['資本額'] ?? item['capital'] ?? item['實收資本額'];
    rows.push({
      tax_id: String(taxId).trim(),
      company_name: String(companyName).trim(),
      status: item['公司狀況'] ?? item['status'] ?? null,
      representative: item['代表人姓名'] ?? item['負責人姓名'] ?? item['representative'] ?? null,
      address: item['公司所在地'] ?? item['address'] ?? null,
      capital: capitalVal != null ? parseInt(String(capitalVal).replace(/,/g, ''), 10) || null : null
    });
  }
  return rows;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: tsx scripts/import-company-registry.ts <data-file> [--db <db-path>]');
    console.error('  資料檔支援 .csv 或 .json 格式');
    process.exit(1);
  }

  const dataFile = args[0];
  const dbIdx = args.indexOf('--db');
  const dbPath = dbIdx >= 0 && args[dbIdx + 1] ? args[dbIdx + 1] : path.join(process.cwd(), 'data', 'firm.db');

  if (!fs.existsSync(dataFile)) {
    console.error(`找不到資料檔：${dataFile}`);
    process.exit(1);
  }

  const content = fs.readFileSync(dataFile, 'utf-8');
  const ext = path.extname(dataFile).toLowerCase();

  let rows: CompanyRow[];
  if (ext === '.json') {
    rows = parseJson(content);
  } else {
    rows = parseCsv(content);
  }

  if (rows.length === 0) {
    console.error('沒有解析到任何資料，請確認檔案格式。');
    process.exit(1);
  }

  console.log(`解析完成，共 ${rows.length} 筆資料，準備寫入 ${dbPath}`);

  const db = new Database(dbPath);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO company_registry (tax_id, company_name, status, representative, address, capital)
    VALUES (@tax_id, @company_name, @status, @representative, @address, @capital)
  `);

  const importAll = db.transaction((data: CompanyRow[]) => {
    for (const row of data) {
      insertStmt.run(row);
    }
  });

  importAll(rows);

  const count = (db.prepare('SELECT COUNT(*) AS cnt FROM company_registry').get() as { cnt: number }).cnt;
  console.log(`匯入完成！資料庫現有 ${count} 筆統編資料。`);
  db.close();
}

main();
