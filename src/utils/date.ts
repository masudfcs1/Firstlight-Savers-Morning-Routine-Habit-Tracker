import type { DateKey } from '../types';

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalDateKey(value: Date | number | string = new Date()): DateKey {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('Cannot create a date key from an invalid date.');
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const dateKeyFromTimestamp = toLocalDateKey;

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) return false;
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value
    .split('-')
    .map(Number);
  const candidate = new Date(year, month - 1, day, 12);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

/** Parses at local noon to avoid rare timezone transitions that occur at midnight. */
export function parseLocalDateKey(dateKey: DateKey): Date {
  if (!isDateKey(dateKey)) throw new RangeError(`Invalid local date key: ${dateKey}`);
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = dateKey
    .split('-')
    .map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDays(dateKey: DateKey, amount: number): DateKey {
  if (!Number.isInteger(amount)) throw new RangeError('Day amount must be an integer.');
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toLocalDateKey(date);
}

export function addMonths(dateKey: DateKey, amount: number): DateKey {
  if (!Number.isInteger(amount)) throw new RangeError('Month amount must be an integer.');
  const source = parseLocalDateKey(dateKey);
  const targetDay = source.getDate();
  source.setDate(1);
  source.setMonth(source.getMonth() + amount);
  const lastDay = new Date(source.getFullYear(), source.getMonth() + 1, 0, 12).getDate();
  source.setDate(Math.min(targetDay, lastDay));
  return toLocalDateKey(source);
}

export function compareDateKeys(left: DateKey, right: DateKey): number {
  if (!isDateKey(left) || !isDateKey(right)) throw new RangeError('Invalid date key.');
  return left === right ? 0 : left < right ? -1 : 1;
}

export function differenceInCalendarDays(later: DateKey, earlier: DateKey): number {
  if (!isDateKey(later) || !isDateKey(earlier)) throw new RangeError('Invalid date key.');
  const [laterYear = 0, laterMonth = 0, laterDay = 0] = later.split('-').map(Number);
  const [earlierYear = 0, earlierMonth = 0, earlierDay = 0] = earlier.split('-').map(Number);
  const laterUtc = Date.UTC(laterYear, laterMonth - 1, laterDay);
  const earlierUtc = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);
  return Math.round((laterUtc - earlierUtc) / DAY_MS);
}

export function eachDateKey(start: DateKey, end: DateKey): DateKey[] {
  const count = differenceInCalendarDays(end, start) + 1;
  if (count < 0) return [];
  if (count > 100_000) throw new RangeError('Date range is too large.');
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function startOfWeek(dateKey: DateKey, weekStartsOn: 0 | 1 | 6 = 1): DateKey {
  const date = parseLocalDateKey(dateKey);
  const offset = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(dateKey, -offset);
}

export function endOfWeek(dateKey: DateKey, weekStartsOn: 0 | 1 | 6 = 1): DateKey {
  return addDays(startOfWeek(dateKey, weekStartsOn), 6);
}

export function startOfMonth(dateKey: DateKey): DateKey {
  const [year, month] = dateKey.split('-');
  const result = `${year}-${month}-01`;
  if (!isDateKey(result)) throw new RangeError('Invalid date key.');
  return result;
}

export function endOfMonth(dateKey: DateKey): DateKey {
  const date = parseLocalDateKey(startOfMonth(dateKey));
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toLocalDateKey(date);
}

export function minDateKey(values: readonly DateKey[]): DateKey | undefined {
  return values.filter(isDateKey).sort()[0];
}

export function maxDateKey(values: readonly DateKey[]): DateKey | undefined {
  return values.filter(isDateKey).sort().at(-1);
}
