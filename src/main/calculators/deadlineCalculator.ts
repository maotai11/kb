import type Database from 'better-sqlite3';
import type {
  DeadlineCalculationInput,
  DeadlineCalculationResult
} from '../../shared/ipc-types';

type HolidayRow = {
  name: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(dateText: string): Date {
  const [yearText, monthText, dayText] = dateText.split('-');
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function adjustDeadline(db: Database.Database, rawDeadline: string): string {
  return calculateDeadline(db, { rawDeadline }).adjustedDeadline;
}

export function calculateDeadline(
  db: Database.Database,
  input: DeadlineCalculationInput
): DeadlineCalculationResult {
  const rawDate = parseDate(input.rawDeadline);
  let current = rawDate;
  const steps: DeadlineCalculationResult['steps'] = [];

  while (true) {
    const currentText = formatDate(current);
    const dayOfWeek = current.getDay();

    if (dayOfWeek === 0) {
      steps.push({
        date: currentText,
        reason: 'sunday',
        holidayName: null
      });
      current = addDays(current, 1);
      continue;
    }

    if (dayOfWeek === 6) {
      steps.push({
        date: currentText,
        reason: 'saturday',
        holidayName: null
      });
      current = addDays(current, 2);
      continue;
    }

    const holiday = db
      .prepare(
        `
          SELECT name
          FROM holidays
          WHERE holiday_date = ?
            AND is_makeup = 0
        `
      )
      .get(currentText) as HolidayRow | undefined;

    if (holiday) {
      steps.push({
        date: currentText,
        reason: 'holiday',
        holidayName: holiday.name
      });
      current = addDays(current, 1);
      continue;
    }

    break;
  }

  return {
    rawDeadline: input.rawDeadline,
    adjustedDeadline: formatDate(current),
    adjustmentDays: Math.round((current.getTime() - rawDate.getTime()) / MS_PER_DAY),
    steps
  };
}
