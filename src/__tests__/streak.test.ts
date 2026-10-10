import {
  buildAchievements,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateSevenDayConsistency,
} from '../services/streakService';
import { createDefaultActivityConfigs } from '../constants';
import type { DailyRoutineRecord, DateKey } from '../types';
import { completeActivity, createDailyRoutineRecord } from '../utils';

function zeroRoutine(dateKey: DateKey): DailyRoutineRecord {
  return createDailyRoutineRecord(
    dateKey,
    [{ ...createDefaultActivityConfigs()[0]!, durationSeconds: 60 }],
    '2026-10-10T06:00:00.000Z',
  );
}

function completedRoutine(dateKey: DateKey): DailyRoutineRecord {
  return completeActivity(zeroRoutine(dateKey), 'SILENCE', {
    method: 'TIMER',
    durationElapsedSeconds: 60,
    durationCompletedSeconds: 60,
    completedAt: '2026-10-10T06:00:00.000Z',
  });
}

describe('streak calculations', () => {
  it('gives the in-progress current day a grace period', () => {
    const history = {
      '2026-10-07': completedRoutine('2026-10-07'),
      '2026-10-08': completedRoutine('2026-10-08'),
      '2026-10-09': completedRoutine('2026-10-09'),
      '2026-10-10': zeroRoutine('2026-10-10'),
    };
    expect(calculateCurrentStreak(history, '2026-10-10')).toBe(3);
    expect(calculateCurrentStreak(history, '2026-10-10', false)).toBe(0);
  });

  it('breaks streaks on missing and recorded-incomplete days', () => {
    const history = {
      '2026-10-01': completedRoutine('2026-10-01'),
      '2026-10-02': completedRoutine('2026-10-02'),
      '2026-10-04': completedRoutine('2026-10-04'),
      '2026-10-05': zeroRoutine('2026-10-05'),
      '2026-10-06': completedRoutine('2026-10-06'),
    };
    expect(calculateLongestStreak(history, '2026-10-10')).toBe(2);
  });

  it('uses seven calendar days and unlocks unique completed-day milestones', () => {
    const history = Object.fromEntries(
      ['2026-10-04', '2026-10-05', '2026-10-06'].map((date) => [date, completedRoutine(date)]),
    );
    expect(calculateSevenDayConsistency(history, '2026-10-10')).toBeCloseTo((3 / 7) * 100);
    expect(buildAchievements(history, '2026-10-10')[0]).toMatchObject({
      milestone: 3,
      unlocked: true,
      unlockedAt: '2026-10-06',
    });
  });
});
