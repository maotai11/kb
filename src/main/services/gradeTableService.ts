import type Database from 'better-sqlite3';

type GradeLookupRequest = {
  fiscalYear: number;
  tableType: string;
  salary: number;
};

type GradeTableRow = {
  fiscal_year: number;
  version_tag: string;
  table_json: string;
};

export type GradeRow = {
  grade: number;
  minSalary: number;
  maxSalary: number | null;
  insuredSalary: number;
};

type GradeTablePayload = {
  version: string;
  rows: GradeRow[];
};

export type GradeTableSnapshotMeta = {
  fiscal_year: number;
  source: string;
  record_count: number;
};

export function getGradeTable(
  db: Database.Database,
  fiscalYear: number,
  tableType: string
): GradeTablePayload {
  const row = db
    .prepare(
      `
        SELECT version_tag, table_json
        FROM grade_tables
        WHERE fiscal_year = ?
          AND table_type = ?
          AND usage_context = 'effective_year'
      `
    )
    .get(fiscalYear, tableType) as GradeTableRow | undefined;

  if (!row) {
    throw new Error(`Missing grade table: ${tableType} for fiscal year ${fiscalYear}`);
  }

  const parsed = JSON.parse(row.table_json) as GradeTablePayload;
  return {
    version: row.version_tag ?? parsed.version,
    rows: parsed.rows
  };
}

export function getGradeTableSnapshotMeta(
  db: Database.Database,
  fiscalYear: number,
  tableType: string
): GradeTableSnapshotMeta {
  const row = db
    .prepare(
      `
        SELECT fiscal_year, version_tag, table_json
        FROM grade_tables
        WHERE fiscal_year = ?
          AND table_type = ?
          AND usage_context = 'effective_year'
      `
    )
    .get(fiscalYear, tableType) as GradeTableRow | undefined;

  if (!row) {
    throw new Error(`Missing grade table: ${tableType} for fiscal year ${fiscalYear}`);
  }

  const parsed = JSON.parse(row.table_json) as GradeTablePayload;
  return {
    fiscal_year: row.fiscal_year,
    source: row.version_tag ?? parsed.version,
    record_count: parsed.rows.length
  };
}

export function lookupGrade(db: Database.Database, request: GradeLookupRequest): GradeRow {
  const table = getGradeTable(db, request.fiscalYear, request.tableType);
  const matched = table.rows.find((row) => {
    const maxSalary = row.maxSalary ?? Number.POSITIVE_INFINITY;
    return request.salary >= row.minSalary && request.salary <= maxSalary;
  });

  if (matched) {
    return matched;
  }

  return table.rows[table.rows.length - 1];
}
