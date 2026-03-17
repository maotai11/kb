import type Database from 'better-sqlite3';
import type { ScheduleRow, ScheduleCreateInput, ScheduleUpdateInput } from '../../shared/ipc-types';
import { calculateDeadline } from '../calculators/deadlineCalculator';

export function listSchedules(db: Database.Database, clientId?: number): ScheduleRow[] {
  if (clientId != null) {
    return db
      .prepare(
        'SELECT * FROM filing_schedules WHERE client_id = ? ORDER BY adjusted_deadline ASC, raw_deadline ASC'
      )
      .all(clientId) as ScheduleRow[];
  }
  return db
    .prepare('SELECT * FROM filing_schedules ORDER BY adjusted_deadline ASC, raw_deadline ASC')
    .all() as ScheduleRow[];
}

export function createSchedule(
  db: Database.Database,
  data: ScheduleCreateInput
): ScheduleRow {
  let adjustedDeadline: string | null = null;
  try {
    const calc = calculateDeadline(db, { rawDeadline: data.rawDeadline });
    adjustedDeadline = calc.adjustedDeadline;
  } catch {
    adjustedDeadline = data.rawDeadline;
  }

  const stmt = db.prepare(`
    INSERT INTO filing_schedules (client_id, calculator, raw_deadline, adjusted_deadline, notes)
    VALUES (@clientId, @calculator, @rawDeadline, @adjustedDeadline, @notes)
  `);
  const info = stmt.run({
    clientId: data.clientId ?? null,
    calculator: data.calculator,
    rawDeadline: data.rawDeadline,
    adjustedDeadline,
    notes: data.notes ?? null
  });

  return db
    .prepare('SELECT * FROM filing_schedules WHERE schedule_id = ?')
    .get(info.lastInsertRowid) as ScheduleRow;
}

export function updateSchedule(
  db: Database.Database,
  scheduleId: number,
  data: ScheduleUpdateInput
): ScheduleRow {
  const fields: string[] = [];
  const params: Record<string, unknown> = { scheduleId };

  if (data.notes !== undefined) {
    fields.push('notes = @notes');
    params.notes = data.notes;
  }
  if (data.isDone !== undefined) {
    fields.push('is_done = @isDone');
    params.isDone = data.isDone ? 1 : 0;
  }

  if (fields.length === 0) {
    return db.prepare('SELECT * FROM filing_schedules WHERE schedule_id = ?').get(scheduleId) as ScheduleRow;
  }

  db.prepare(`UPDATE filing_schedules SET ${fields.join(', ')} WHERE schedule_id = @scheduleId`).run(params);
  return db.prepare('SELECT * FROM filing_schedules WHERE schedule_id = ?').get(scheduleId) as ScheduleRow;
}

export function deleteSchedule(db: Database.Database, scheduleId: number): void {
  db.prepare('DELETE FROM filing_schedules WHERE schedule_id = ?').run(scheduleId);
}
