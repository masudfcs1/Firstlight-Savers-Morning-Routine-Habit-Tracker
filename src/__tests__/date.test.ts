import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDateKey,
  isDateKey,
  parseLocalDateKey,
  startOfWeek,
  toLocalDateKey,
} from '../utils';

describe('local calendar date keys', () => {
  it('round-trips a device-local calendar day', () => {
    const local = new Date(2026, 9, 10, 23, 59);
    expect(toLocalDateKey(local)).toBe('2026-10-10');
    expect(toLocalDateKey(parseLocalDateKey('2026-10-10'))).toBe('2026-10-10');
  });

  it('rejects impossible dates', () => {
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2024-02-29')).toBe(true);
    expect(() => parseLocalDateKey('10/10/2026')).toThrow(RangeError);
  });

  it('uses calendar arithmetic across month, year, and DST-sized days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(differenceInCalendarDays('2026-03-10', '2026-03-01')).toBe(9);
    expect(eachDateKey('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
  });

  it('supports explicit week boundaries', () => {
    expect(startOfWeek('2026-10-10', 1)).toBe('2026-10-05');
    expect(startOfWeek('2026-10-10', 0)).toBe('2026-10-04');
  });
});
