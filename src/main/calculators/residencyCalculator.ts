import type {
  ResidencyCalculationInput,
  ResidencyCalculationResult,
  ResidencyStayInput
} from '../../shared/ipc-types';

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

function addMonthsPreservingDay(date: Date, months: number): Date {
  const targetMonthIndex = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(targetMonthIndex / 12);
  const month = ((targetMonthIndex % 12) + 12) % 12;
  const day = date.getDate();
  const candidate = new Date(year, month, day);

  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }

  return candidate;
}

function getOverlapDays(
  stay: ResidencyStayInput,
  periodStart: Date,
  periodEndInclusive: Date
): number {
  const entryDate = parseDate(stay.entryDate);
  const departureExclusive = parseDate(stay.departureDate);
  const overlapStart = Math.max(entryDate.getTime(), periodStart.getTime());
  const overlapEndExclusive = Math.min(
    departureExclusive.getTime(),
    addDays(periodEndInclusive, 1).getTime()
  );

  if (overlapEndExclusive <= overlapStart) {
    return 0;
  }

  return Math.round((overlapEndExclusive - overlapStart) / MS_PER_DAY);
}

export function calculateResidencyDays(
  input: ResidencyCalculationInput
): ResidencyCalculationResult {
  let periodStart: Date;
  let periodEnd: Date;
  let lawBasis: string;

  if (input.mode === 'calendar_year') {
    if (input.taxYear == null) {
      throw new Error('calendar_year requires taxYear');
    }
    periodStart = new Date(input.taxYear, 0, 1);
    periodEnd = new Date(input.taxYear, 11, 31);
    lawBasis = '所得稅法§7（日曆年度）';
  } else {
    if (!input.referenceDate) {
      throw new Error('rolling_12m requires referenceDate');
    }
    periodEnd = parseDate(input.referenceDate);
    periodStart = addDays(addMonthsPreservingDay(periodEnd, -12), 1);
    lawBasis = '租稅協定居民認定條款（滾動12個月）';
  }

  const totalDays = input.stays.reduce(
    (sum, stay) => sum + getOverlapDays(stay, periodStart, periodEnd),
    0
  );

  return {
    mode: input.mode,
    periodStart: formatDate(periodStart),
    periodEnd: formatDate(periodEnd),
    lawBasis,
    totalDays,
    isResident: totalDays >= 183
  };
}
