import type Database from 'better-sqlite3';
import type {
  DbParamsRequest,
  HistoryDetail,
  HistoryListFilter,
  HistoryListItem,
  ParamsSnapshot
} from '../../shared/ipc-types';
import { getGradeTableSnapshotMeta } from './gradeTableService';
import { getYearlyParamSnapshot } from './yearlyParamsService';

type SaveHistoryRequest = {
  calculator: string;
  fiscalYear: number | null;
  inputs: unknown;
  outputs: unknown;
  paramsSnapshot: ParamsSnapshot | null;
  gradeSnapshot?: unknown;
};

type SnapshotConfig = {
  paramsRequest: DbParamsRequest;
  paramsVersion: string;
  gradeTables?: string[];
};

type HistoryRow = {
  calc_id: number;
  calculator: string;
  fiscal_year: number | null;
  inputs: string;
  outputs: string;
  params_snapshot: string | null;
  grade_snapshot: string | null;
  created_at: string;
  is_bookmarked: number;
};

function getLocalSnapshotTime(db: Database.Database): string {
  const row = db.prepare("SELECT datetime('now','localtime') AS value").get() as { value: string };
  return row.value;
}

export function buildParamsSnapshot(
  db: Database.Database,
  config: SnapshotConfig
): ParamsSnapshot {
  const snapshot: ParamsSnapshot = {
    snapshot_time: getLocalSnapshotTime(db),
    params_version: config.paramsVersion,
    used_params: getYearlyParamSnapshot(db, config.paramsRequest)
  };

  if (config.gradeTables?.length) {
    snapshot.used_grade_tables = config.gradeTables.reduce<NonNullable<ParamsSnapshot['used_grade_tables']>>(
      (result, tableType) => {
        result[tableType] = getGradeTableSnapshotMeta(
          db,
          config.paramsRequest.fiscalYear,
          tableType
        );
        return result;
      },
      {}
    );
  }

  return snapshot;
}

export function buildStaticParamsSnapshot(
  db: Database.Database,
  paramsVersion: string
): ParamsSnapshot {
  return {
    snapshot_time: getLocalSnapshotTime(db),
    params_version: paramsVersion,
    used_params: {}
  };
}

export function saveCalculationHistory(
  db: Database.Database,
  request: SaveHistoryRequest
): number {
  const result = db
    .prepare(
      `
        INSERT INTO calc_history (
          calculator, fiscal_year, inputs, outputs, params_snapshot, grade_snapshot
        ) VALUES (
          @calculator, @fiscalYear, @inputs, @outputs, @paramsSnapshot, @gradeSnapshot
        )
      `
    )
    .run({
      calculator: request.calculator,
      fiscalYear: request.fiscalYear,
      inputs: JSON.stringify(request.inputs),
      outputs: JSON.stringify(request.outputs),
      paramsSnapshot: request.paramsSnapshot ? JSON.stringify(request.paramsSnapshot) : null,
      gradeSnapshot: request.gradeSnapshot ? JSON.stringify(request.gradeSnapshot) : null
    });

  return Number(result.lastInsertRowid);
}

export function listHistory(
  db: Database.Database,
  filter: HistoryListFilter = {}
): HistoryListItem[] {
  const rows = db
    .prepare(
      `
        SELECT calc_id, calculator, fiscal_year, created_at, is_bookmarked
        FROM calc_history
        WHERE (@calculator IS NULL OR calculator = @calculator)
          AND (@bookmarkedOnly = 0 OR is_bookmarked = 1)
        ORDER BY created_at DESC, calc_id DESC
        LIMIT @limit
      `
    )
    .all({
      calculator: filter.calculator ?? null,
      bookmarkedOnly: filter.bookmarkedOnly ? 1 : 0,
      limit: filter.limit ?? 50
    }) as Array<{
    calc_id: number;
    calculator: string;
    fiscal_year: number | null;
    created_at: string;
    is_bookmarked: number;
  }>;

  return rows.map((row) => ({
    calcId: row.calc_id,
    calculator: row.calculator,
    fiscalYear: row.fiscal_year,
    createdAt: row.created_at,
    isBookmarked: row.is_bookmarked === 1
  }));
}

export function getHistoryDetail(db: Database.Database, calcId: number): HistoryDetail | null {
  const row = db
    .prepare(
      `
        SELECT calc_id, calculator, fiscal_year, inputs, outputs, params_snapshot, grade_snapshot, created_at, is_bookmarked
        FROM calc_history
        WHERE calc_id = ?
      `
    )
    .get(calcId) as HistoryRow | undefined;

  if (!row) {
    return null;
  }

  return {
    calcId: row.calc_id,
    calculator: row.calculator,
    fiscalYear: row.fiscal_year,
    inputs: JSON.parse(row.inputs),
    outputs: JSON.parse(row.outputs),
    paramsSnapshot: row.params_snapshot ? (JSON.parse(row.params_snapshot) as ParamsSnapshot) : null,
    gradeSnapshot: row.grade_snapshot ? JSON.parse(row.grade_snapshot) : null,
    createdAt: row.created_at,
    isBookmarked: row.is_bookmarked === 1
  };
}

export function bookmarkHistory(
  db: Database.Database,
  calcId: number,
  flag: boolean
): { calcId: number; isBookmarked: boolean } {
  db.prepare(
    'UPDATE calc_history SET is_bookmarked = @isBookmarked WHERE calc_id = @calcId'
  ).run({
    isBookmarked: flag ? 1 : 0,
    calcId
  });
  return { calcId, isBookmarked: flag };
}

export function deleteHistory(
  db: Database.Database,
  calcId: number
): { deleted: boolean } {
  const result = db.prepare('DELETE FROM calc_history WHERE calc_id = @calcId').run({ calcId });
  return { deleted: result.changes > 0 };
}
