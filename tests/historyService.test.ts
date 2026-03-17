import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import {
  bookmarkHistory,
  buildParamsSnapshot,
  deleteHistory,
  getHistoryDetail,
  listHistory,
  saveCalculationHistory
} from '../src/main/services/historyService';

describe('calc_history service', () => {
  function setupDb() {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);
    return db;
  }

  it('builds params_snapshot in spec shape and includes grade tables for payroll', () => {
    const db = setupDb();

    const snapshot = buildParamsSnapshot(db, {
      paramsRequest: {
        fiscalYear: 115,
        category: 'LABOR',
        usageContext: 'effective_year'
      },
      paramsVersion: '115-baseline',
      gradeTables: ['LABOR_INS', 'NHI', 'PENSION']
    });

    expect(snapshot.snapshot_time).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    expect(snapshot.params_version).toBe('115-baseline');
    expect(snapshot.used_params.min_wage_monthly).toEqual({
      value: 29500,
      is_confirmed: true
    });
    expect(snapshot.used_grade_tables?.LABOR_INS.record_count).toBe(11);
    expect(snapshot.used_grade_tables?.NHI.fiscal_year).toBe(115);
    expect(snapshot.used_grade_tables?.PENSION.source).toBe('115-baseline');
  });

  it('saves, lists, retrieves, bookmarks and deletes history entries', () => {
    const db = setupDb();

    const calcId = saveCalculationHistory(db, {
      calculator: 'cit',
      fiscalYear: 115,
      inputs: { taxableIncome: 200000 },
      outputs: { taxPayable: 40000 },
      paramsSnapshot: buildParamsSnapshot(db, {
        paramsRequest: {
          fiscalYear: 115,
          category: 'TAX_CIT',
          usageContext: 'income_year'
        },
        paramsVersion: '115-baseline'
      })
    });

    const list = listHistory(db, { calculator: 'cit' });
    expect(list).toHaveLength(1);
    expect(list[0]?.calcId).toBe(calcId);
    expect(list[0]?.isBookmarked).toBe(false);

    const detail = getHistoryDetail(db, calcId);
    expect(detail?.calculator).toBe('cit');
    expect(detail?.paramsSnapshot?.used_params.cit_rate).toEqual({
      value: 0.2,
      is_confirmed: true
    });

    const bookmarked = bookmarkHistory(db, calcId, true);
    expect(bookmarked.isBookmarked).toBe(true);
    expect(listHistory(db, { bookmarkedOnly: true })).toHaveLength(1);

    const deleted = deleteHistory(db, calcId);
    expect(deleted.deleted).toBe(true);
    expect(getHistoryDetail(db, calcId)).toBeNull();
  });
});
