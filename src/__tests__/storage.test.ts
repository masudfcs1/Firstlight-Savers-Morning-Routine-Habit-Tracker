import { CURRENT_SCHEMA_VERSION, createDefaultPersistedState } from '../constants';
import {
  AppRepository,
  StorageValidationError,
  parseImport,
  type StorageAdapter,
} from '../storage';
import { IMPORT_BUNDLE_FORMAT } from '../types';

function createMemoryStorage(initial: string | null = null): {
  adapter: StorageAdapter;
  read: () => string | null;
} {
  let value = initial;
  return {
    adapter: {
      getItem: jest.fn(async () => value),
      setItem: jest.fn(async (_key: string, next: string) => {
        value = next;
      }),
      removeItem: jest.fn(async () => {
        value = null;
      }),
    },
    read: () => value,
  };
}

describe('versioned local repository', () => {
  it('returns fresh defaults for a first launch and writes a current envelope', async () => {
    const memory = createMemoryStorage();
    const repository = new AppRepository(memory.adapter, 'test-key');
    const initial = await repository.load();
    expect(initial).toEqual(createDefaultPersistedState());
    await repository.save(initial);
    expect(JSON.parse(memory.read() ?? '{}')).toMatchObject({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      data: { activeTimer: null, routinesByDate: {} },
    });
  });

  it('surfaces corrupt storage instead of silently discarding it', async () => {
    const repository = new AppRepository(createMemoryStorage('{nope').adapter, 'test-key');
    await expect(repository.load()).rejects.toBeInstanceOf(StorageValidationError);
  });

  it('exports a validated round-trippable import bundle', async () => {
    const repository = new AppRepository(createMemoryStorage().adapter, 'test-key');
    const json = await repository.exportJson(false);
    const parsed = parseImport(json);
    expect(parsed).toMatchObject({
      format: IMPORT_BUNDLE_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    expect(parsed.data).toEqual(createDefaultPersistedState());
  });

  it('rejects unrelated and oversized-looking invalid imports', () => {
    expect(() => parseImport(JSON.stringify({ format: 'SOMETHING_ELSE' }))).toThrow(
      /not a Miracle Morning backup/,
    );
    expect(() => parseImport('{broken')).toThrow(/not valid JSON/);
  });
});
