import { CURRENT_SCHEMA_VERSION } from '../constants';
import { MigrationError, migrateStoredValue } from '../storage';

describe('storage migrations', () => {
  const now = '2026-10-10T00:00:00.000Z';

  it('migrates v1 arrays and strips redundant summary values', () => {
    const result = migrateStoredValue(
      {
        schemaVersion: 1,
        data: {
          settings: {
            theme: 'dark',
            activities: [{ id: 'SILENCE', durationMinutes: 7, enabled: true }],
          },
          dailyRecords: [
            {
              dateKey: '2026-10-09',
              completionPercentage: 999,
              activities: [
                {
                  activityId: 'SILENCE',
                  plannedDurationSeconds: 420,
                  completedDurationSeconds: 120,
                  status: 'COMPLETED',
                  completionMethod: 'MANUAL',
                  completedAt: now,
                },
              ],
            },
          ],
        },
      },
      now,
    );
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.data.settings.preferences.theme).toBe('DARK');
    expect(result.data.settings.activityConfigs[0]?.durationSeconds).toBe(420);
    const day = result.data.routinesByDate['2026-10-09'];
    expect(day).toBeDefined();
    expect(day).not.toHaveProperty('completionPercentage');
    expect(day?.activities[0]).toMatchObject({
      durationPlannedSeconds: 420,
      durationElapsedSeconds: 120,
      durationCompletedSeconds: 120,
    });
  });

  it('rejects unknown future schemas instead of silently resetting', () => {
    expect(() => migrateStoredValue({ schemaVersion: 999, data: {} }, now)).toThrow(
      MigrationError,
    );
  });

  it('rejects malformed current data', () => {
    expect(() =>
      migrateStoredValue({ schemaVersion: CURRENT_SCHEMA_VERSION, data: { routinesByDate: [] } }),
    ).toThrow(/malformed or unsafe/);
  });

  it('does not reinterpret unrelated legacy JSON as an empty app state', () => {
    expect(() => migrateStoredValue({ schemaVersion: 1, data: { unrelated: true } }, now)).toThrow(
      /no recognized app fields/,
    );
  });
});
