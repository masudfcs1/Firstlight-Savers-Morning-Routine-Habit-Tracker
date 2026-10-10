import {
  buildAnalytics,
  calculateTrend,
  createDailyAnalyticsSeries,
  getAnalyticsDateRange,
} from '../services/analyticsService';
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

function completedRoutine(dateKey: DateKey, seconds = 60): DailyRoutineRecord {
  return completeActivity(zeroRoutine(dateKey), 'SILENCE', {
    method: 'TIMER',
    durationElapsedSeconds: seconds,
    durationCompletedSeconds: seconds,
    completedAt: '2026-10-10T06:00:00.000Z',
  });
}

describe('historical analytics', () => {
  it('distinguishes missing dates from a saved zero-progress routine', () => {
    const range = getAnalyticsDateRange('LAST_7_DAYS', '2026-10-10');
    const points = createDailyAnalyticsSeries(
      { '2026-10-09': zeroRoutine('2026-10-09') },
      range,
    );
    expect(points.find((point) => point.dateKey === '2026-10-08')).toMatchObject({
      recorded: false,
      completionPercentage: null,
    });
    expect(points.find((point) => point.dateKey === '2026-10-09')).toMatchObject({
      recorded: true,
      completionPercentage: 0,
    });
  });

  it('builds real daily, period, breakdown, heatmap and summary data', () => {
    const history = {
      '2026-10-08': completedRoutine('2026-10-08', 60),
      '2026-10-09': zeroRoutine('2026-10-09'),
      '2026-10-10': completedRoutine('2026-10-10', 30),
    };
    const result = buildAnalytics(history, {
      filter: 'LAST_7_DAYS',
      asOfDateKey: '2026-10-10',
    });
    expect(result.daily).toHaveLength(7);
    expect(result.summary).toMatchObject({
      recordedDays: 3,
      totalCompletedRoutines: 2,
      totalCompletedSeconds: 90,
    });
    expect(result.summary.averageDailyCompletionPercentage).toBeCloseTo(200 / 3);
    expect(result.breakdown.find((item) => item.activityId === 'SILENCE')).toMatchObject({
      completedSeconds: 90,
      completionCount: 2,
      sharePercentage: 100,
    });
    expect(result.heatmap.find((item) => item.dateKey === '2026-10-07')?.intensity).toBeNull();
    expect(result.heatmap.find((item) => item.dateKey === '2026-10-09')?.intensity).toBe(0);
    expect(result.weekly.length).toBeGreaterThan(0);
    expect(result.monthly[0]?.completedRoutineDays).toBe(2);
  });

  it('reports trend only when both equivalent periods contain records', () => {
    const history = {
      '2026-09-28': zeroRoutine('2026-09-28'),
      '2026-10-05': completedRoutine('2026-10-05'),
    };
    const current = getAnalyticsDateRange('LAST_7_DAYS', '2026-10-10');
    expect(calculateTrend(history, current, 'LAST_7_DAYS')).toMatchObject({
      available: true,
      previousAveragePercentage: 0,
      currentAveragePercentage: 100,
      percentagePointChange: 100,
      direction: 'UP',
    });
    expect(calculateTrend({}, current, 'LAST_7_DAYS').available).toBe(false);
  });
});
