import { createDefaultPersistedState } from '../constants';
import { getTimerSnapshot } from '../services';
import { useAppStore } from '../store';

describe('routine store timer navigation', () => {
  beforeEach(() => {
    useAppStore.setState({
      ...createDefaultPersistedState(),
      hydrated: true,
      storageError: null,
    });
  });

  it('preserves elapsed time when switching away and back', () => {
    const dateKey = '2026-10-10';
    const store = useAppStore.getState();
    store.ensureRoutine(dateKey);
    expect(store.beginActivity(dateKey, 'SILENCE')).toBe(true);

    const firstSession = useAppStore.getState().activeTimer;
    expect(firstSession?.runningSince).toBeDefined();
    const firstStarted = new Date(firstSession?.runningSince ?? 0).getTime();
    const switchedAt = firstStarted + 30_000;
    expect(
      useAppStore.getState().switchActivity(dateKey, 'AFFIRMATIONS', switchedAt),
    ).toBe(true);

    const afterFirstSwitch = useAppStore.getState();
    const silence = afterFirstSwitch.routinesByDate[dateKey]?.activities.find(
      (activity) => activity.activityId === 'SILENCE',
    );
    expect(silence?.durationElapsedSeconds).toBeCloseTo(30);
    expect(afterFirstSwitch.activeTimer?.activityId).toBe('AFFIRMATIONS');

    expect(
      afterFirstSwitch.switchActivity(dateKey, 'SILENCE', switchedAt + 15_000),
    ).toBe(true);
    const resumed = useAppStore.getState().activeTimer;
    expect(resumed?.activityId).toBe('SILENCE');
    expect(resumed ? getTimerSnapshot(resumed, switchedAt + 15_000).preciseElapsedSeconds : 0)
      .toBeCloseTo(30);
  });
});
