import type Database from 'better-sqlite3';
import type { DbParamsRequest } from '../../shared/ipc-types';

type YearlyParamRow = {
  param_key: string;
  param_value: number | null;
  param_text: string | null;
  is_confirmed: number;
};

export type YearlyParamSnapshotMap = Record<
  string,
  {
    value: number | string | null;
    is_confirmed: boolean;
  }
>;

function getYearlyParamRows(db: Database.Database, request: DbParamsRequest): YearlyParamRow[] {
  return db
    .prepare(
      `
        SELECT param_key, param_value, param_text, is_confirmed
        FROM yearly_params
        WHERE fiscal_year = @fiscalYear
          AND category = @category
          AND usage_context = @usageContext
        ORDER BY param_key
      `
    )
    .all(request) as YearlyParamRow[];
}

export function getYearlyParamMap(
  db: Database.Database,
  request: DbParamsRequest
): Record<string, number | string | null> {
  const rows = getYearlyParamRows(db, request);

  return rows.reduce<Record<string, number | string | null>>((result, row) => {
    result[row.param_key] = row.param_value ?? row.param_text;
    return result;
  }, {});
}

export function getYearlyParamSnapshot(
  db: Database.Database,
  request: DbParamsRequest
): YearlyParamSnapshotMap {
  const rows = getYearlyParamRows(db, request);

  return rows.reduce<YearlyParamSnapshotMap>((result, row) => {
    result[row.param_key] = {
      value: row.param_value ?? row.param_text,
      is_confirmed: row.is_confirmed === 1
    };
    return result;
  }, {});
}
