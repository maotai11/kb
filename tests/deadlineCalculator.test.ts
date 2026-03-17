import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../src/main/db/migrations';
import { seedBaselineData } from '../src/main/db/seed';
import { adjustDeadline } from '../src/main/calculators/deadlineCalculator';

describe('Module D deadline adjustment', () => {
  function setupDb() {
    const db = new Database(':memory:');
    migrateDatabase(db);
    seedBaselineData(db);
    return db;
  }

  it('returns the same date for a weekday', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-03-05')).toBe('2025-03-05');
  });

  it('pushes Saturday to Monday', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-03-08')).toBe('2025-03-10');
  });

  it('pushes Sunday to Monday', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-03-09')).toBe('2025-03-10');
  });

  it('pushes a weekday holiday to the next business day', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-03-03')).toBe('2025-03-04');
  });

  it('keeps looping across a long holiday plus weekend chain until Tuesday', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-02-28')).toBe('2025-03-04');
  });

  it('treats makeup workdays as normal business days', () => {
    const db = setupDb();

    expect(adjustDeadline(db, '2025-03-11')).toBe('2025-03-11');
  });
});
