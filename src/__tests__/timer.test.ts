import {
  createTimerSession,
  getTimerSnapshot,
  pauseTimer,
  restartTimer,
  resumeTimer,
  synchronizeTimer,
} from '../services/timerService';

describe('timestamp-based timer', () => {
  const start = '2026-10-10T06:00:00.000Z';

  it('reconstructs elapsed time after backgrounding without interval ticks', () => {
    const timer = createTimerSession({
      id: 'timer-1',
      dateKey: '2026-10-10',
      activityId: 'SILENCE',
      plannedSeconds: 300,
      now: start,
    });
    expect(getTimerSnapshot(timer, '2026-10-10T06:02:03.400Z')).toMatchObject({
      elapsedSeconds: 123,
      remainingSeconds: 177,
      hasReachedZero: false,
    });
  });

  it('preserves fractional time over pause and resume cycles', () => {
    const initial = createTimerSession({
      dateKey: '2026-10-10',
      activityId: 'SILENCE',
      plannedSeconds: 10,
      now: start,
    });
    const paused = pauseTimer(initial, '2026-10-10T06:00:01.500Z');
    expect(paused.accumulatedElapsedSeconds).toBe(1.5);
    const resumed = resumeTimer(paused, '2026-10-10T06:01:00.000Z');
    expect(getTimerSnapshot(resumed, '2026-10-10T06:01:01.500Z').preciseElapsedSeconds).toBe(3);
  });

  it('resumes a previously visited activity from its saved elapsed time', () => {
    const timer = createTimerSession({
      dateKey: '2026-10-10',
      activityId: 'READING',
      plannedSeconds: 600,
      initialElapsedSeconds: 125.5,
      now: start,
    });
    expect(getTimerSnapshot(timer, start)).toMatchObject({
      preciseElapsedSeconds: 125.5,
      remainingSeconds: 475,
      hasReachedZero: false,
    });
  });

  it('awaits confirmation at zero instead of completing a routine', () => {
    const timer = createTimerSession({
      dateKey: '2026-10-10',
      activityId: 'SILENCE',
      plannedSeconds: 5,
      now: start,
    });
    const reconciled = synchronizeTimer(timer, '2026-10-10T06:01:00.000Z');
    expect(reconciled.status).toBe('AWAITING_CONFIRMATION');
    expect(reconciled.accumulatedElapsedSeconds).toBe(5);
    expect(reconciled.reachedZeroAt).toBe('2026-10-10T06:01:00.000Z');
    expect(() => resumeTimer(reconciled)).toThrow(/confirmed or restarted/);
    expect(restartTimer(reconciled, '2026-10-10T06:02:00.000Z').status).toBe('RUNNING');
  });
});
