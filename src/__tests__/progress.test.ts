import { createDefaultActivityConfigs } from '../constants';
import {
  completeActivity,
  createDailyRoutineRecord,
  deriveRoutineProgress,
  setActivityElapsed,
  startActivity,
} from '../utils';

describe('routine progress', () => {
  it('derives both activity and credited-time progress from activity snapshots', () => {
    let day = createDailyRoutineRecord(
      '2026-10-10',
      createDefaultActivityConfigs(),
      '2026-10-10T05:00:00.000Z',
    );
    day = completeActivity(day, 'SILENCE', {
      method: 'MANUAL',
      durationElapsedSeconds: 30,
      durationCompletedSeconds: 30,
      completedAt: '2026-10-10T05:01:00.000Z',
    });
    const progress = deriveRoutineProgress(day);
    expect(progress.scheduledActivityCount).toBe(6);
    expect(progress.completedActivityCount).toBe(1);
    expect(progress.activityCompletionPercentage).toBeCloseTo(100 / 6);
    expect(progress.plannedSeconds).toBe(2_400);
    expect(progress.completedSeconds).toBe(30);
    expect(progress.timeCompletionPercentage).toBeCloseTo(1.25);
  });

  it('tracks elapsed work separately and gives skipped work zero credit', () => {
    let day = createDailyRoutineRecord(
      '2026-10-10',
      createDefaultActivityConfigs(),
      '2026-10-10T05:00:00.000Z',
    );
    day = startActivity(day, 'EXERCISE', '2026-10-10T05:00:00.000Z');
    day = setActivityElapsed(day, 'EXERCISE', 125, '2026-10-10T05:02:05.000Z');
    day = completeActivity(day, 'EXERCISE', {
      method: 'SKIPPED',
      durationElapsedSeconds: 125,
      durationCompletedSeconds: 999,
      completedAt: '2026-10-10T05:02:05.000Z',
    });
    const exercise = day.activities.find((item) => item.activityId === 'EXERCISE');
    expect(exercise?.durationElapsedSeconds).toBe(125);
    expect(exercise?.durationCompletedSeconds).toBe(0);
    expect(deriveRoutineProgress(day).completedActivityCount).toBe(0);
  });

  it('does not duplicate a terminal completion and clamps percentages', () => {
    const base = createDailyRoutineRecord(
      '2026-10-10',
      [{ ...createDefaultActivityConfigs()[0]!, durationSeconds: 60 }],
      '2026-10-10T05:00:00.000Z',
    );
    const completed = completeActivity(base, 'SILENCE', {
      method: 'TIMER',
      durationElapsedSeconds: 90,
      durationCompletedSeconds: 90,
      completedAt: '2026-10-10T05:02:00.000Z',
    });
    expect(
      completeActivity(completed, 'SILENCE', {
        method: 'MANUAL',
        durationCompletedSeconds: 1,
      }),
    ).toBe(completed);
    expect(deriveRoutineProgress(completed)).toMatchObject({
      activityCompletionPercentage: 100,
      timeCompletionPercentage: 100,
      isRoutineComplete: true,
    });
  });

  it('omits disabled activities and keeps its duration snapshot immutable', () => {
    const configs = createDefaultActivityConfigs();
    configs[1]!.enabled = false;
    const day = createDailyRoutineRecord('2026-10-10', configs);
    configs[0]!.durationSeconds = 9_999;
    expect(day.activities).toHaveLength(5);
    expect(day.activities[0]?.durationPlannedSeconds).toBe(300);
  });
});
