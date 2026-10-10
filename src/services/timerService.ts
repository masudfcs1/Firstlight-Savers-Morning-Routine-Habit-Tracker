import type { DateKey, SaverKey, TimerSession } from '../types';
import { clamp } from '../utils';

export type TimerSnapshot = {
  elapsedSeconds: number;
  preciseElapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  hasReachedZero: boolean;
};

export type CreateTimerInput = {
  dateKey: DateKey;
  activityId: SaverKey;
  plannedSeconds: number;
  initialElapsedSeconds?: number;
  now?: Date | number | string;
  id?: string;
};

function instant(value: Date | number | string = Date.now()): { iso: string; milliseconds: number } {
  const date = value instanceof Date ? value : new Date(value);
  const milliseconds = date.getTime();
  if (!Number.isFinite(milliseconds)) throw new RangeError('Invalid timer timestamp.');
  return { iso: date.toISOString(), milliseconds };
}

function secondsBetween(later: Date | number | string, earlierIso: string): number {
  const laterMs = instant(later).milliseconds;
  const earlierMs = new Date(earlierIso).getTime();
  if (!Number.isFinite(earlierMs)) return 0;
  return Math.max(0, (laterMs - earlierMs) / 1_000);
}

export function createTimerSession(input: CreateTimerInput): TimerSession {
  const now = instant(input.now);
  const plannedSeconds = Number.isFinite(input.plannedSeconds)
    ? Math.max(0, Math.round(input.plannedSeconds))
    : 0;
  const initialElapsedSeconds = Math.min(
    plannedSeconds,
    Number.isFinite(input.initialElapsedSeconds)
      ? Math.max(0, input.initialElapsedSeconds ?? 0)
      : 0,
  );
  const id =
    input.id ?? `${input.dateKey}:${input.activityId}:${now.milliseconds.toString(36)}`;
  if (plannedSeconds === 0 || initialElapsedSeconds >= plannedSeconds) {
    return {
      id,
      dateKey: input.dateKey,
      activityId: input.activityId,
      plannedSeconds,
      status: 'AWAITING_CONFIRMATION',
      accumulatedElapsedSeconds: initialElapsedSeconds,
      startedAt: now.iso,
      reachedZeroAt: now.iso,
      updatedAt: now.iso,
    };
  }
  return {
    id,
    dateKey: input.dateKey,
    activityId: input.activityId,
    plannedSeconds,
    status: 'RUNNING',
    accumulatedElapsedSeconds: initialElapsedSeconds,
    startedAt: now.iso,
    runningSince: now.iso,
    updatedAt: now.iso,
  };
}

export function getPreciseElapsedSeconds(
  session: TimerSession,
  now: Date | number | string = Date.now(),
): number {
  const accumulated = Math.max(0, session.accumulatedElapsedSeconds);
  if (session.status !== 'RUNNING' || !session.runningSince) return accumulated;
  return accumulated + secondsBetween(now, session.runningSince);
}

export function getTimerSnapshot(
  session: TimerSession,
  now: Date | number | string = Date.now(),
): TimerSnapshot {
  const rawElapsed = getPreciseElapsedSeconds(session, now);
  const preciseElapsedSeconds = Math.min(session.plannedSeconds, rawElapsed);
  const remaining = Math.max(0, session.plannedSeconds - preciseElapsedSeconds);
  return {
    elapsedSeconds: Math.floor(preciseElapsedSeconds),
    preciseElapsedSeconds,
    remainingSeconds: Math.ceil(remaining),
    progress:
      session.plannedSeconds <= 0
        ? 1
        : clamp(preciseElapsedSeconds / session.plannedSeconds, 0, 1),
    hasReachedZero: remaining <= 0,
  };
}

/**
 * Reconciles wall-clock time after foregrounding. Reaching zero only moves the
 * timer to AWAITING_CONFIRMATION; it intentionally does not complete a routine.
 */
export function synchronizeTimer(
  session: TimerSession,
  nowValue: Date | number | string = Date.now(),
): TimerSession {
  if (session.status !== 'RUNNING') return session;
  const now = instant(nowValue);
  const elapsed = getPreciseElapsedSeconds(session, now.milliseconds);
  if (elapsed < session.plannedSeconds) return session;
  return {
    ...session,
    status: 'AWAITING_CONFIRMATION',
    accumulatedElapsedSeconds: session.plannedSeconds,
    runningSince: undefined,
    pausedAt: undefined,
    reachedZeroAt: now.iso,
    updatedAt: now.iso,
  };
}

export function pauseTimer(
  session: TimerSession,
  nowValue: Date | number | string = Date.now(),
): TimerSession {
  if (session.status !== 'RUNNING') return session;
  const synchronized = synchronizeTimer(session, nowValue);
  if (synchronized.status === 'AWAITING_CONFIRMATION') return synchronized;
  const now = instant(nowValue);
  return {
    ...session,
    status: 'PAUSED',
    accumulatedElapsedSeconds: Math.min(
      session.plannedSeconds,
      getPreciseElapsedSeconds(session, now.milliseconds),
    ),
    runningSince: undefined,
    pausedAt: now.iso,
    updatedAt: now.iso,
  };
}

export function resumeTimer(
  session: TimerSession,
  nowValue: Date | number | string = Date.now(),
): TimerSession {
  if (session.status === 'RUNNING') return session;
  if (session.status === 'AWAITING_CONFIRMATION') {
    throw new Error('A finished timer must be confirmed or restarted before it can resume.');
  }
  const now = instant(nowValue);
  return {
    ...session,
    status: 'RUNNING',
    runningSince: now.iso,
    pausedAt: undefined,
    reachedZeroAt: undefined,
    updatedAt: now.iso,
  };
}

export function restartTimer(
  session: TimerSession,
  nowValue: Date | number | string = Date.now(),
): TimerSession {
  const now = instant(nowValue);
  if (session.plannedSeconds <= 0) {
    return {
      ...session,
      status: 'AWAITING_CONFIRMATION',
      accumulatedElapsedSeconds: 0,
      startedAt: now.iso,
      runningSince: undefined,
      pausedAt: undefined,
      reachedZeroAt: now.iso,
      updatedAt: now.iso,
    };
  }
  return {
    ...session,
    status: 'RUNNING',
    accumulatedElapsedSeconds: 0,
    startedAt: now.iso,
    runningSince: now.iso,
    pausedAt: undefined,
    reachedZeroAt: undefined,
    updatedAt: now.iso,
  };
}

export function isTimerFor(
  session: TimerSession | null,
  dateKey: DateKey,
  activityId: SaverKey,
): session is TimerSession {
  return session?.dateKey === dateKey && session.activityId === activityId;
}
