import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CURRENT_SCHEMA_VERSION,
  MAX_IMPORT_BYTES,
  STORAGE_KEY,
  createDefaultPersistedState,
} from '../constants';
import { IMPORT_BUNDLE_FORMAT } from '../types';
import type {
  ImportBundle,
  ImportMode,
  PersistedAppState,
  StorageEnvelope,
} from '../types';
import { migrateStoredValue } from './migrations';
import {
  StorageValidationError,
  assertValidPersistedState,
  isPlainObject,
  validateImportBundle,
} from './validation';

export type StorageAdapter = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

export class AppRepository {
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: StorageAdapter = AsyncStorage,
    private readonly key: string = STORAGE_KEY,
  ) {}

  private envelope(data: PersistedAppState, now = new Date().toISOString()): StorageEnvelope {
    assertValidPersistedState(data);
    return { schemaVersion: CURRENT_SCHEMA_VERSION, savedAt: now, data };
  }

  private async read(): Promise<PersistedAppState> {
    const serialized = await this.storage.getItem(this.key);
    if (serialized === null) return createDefaultPersistedState();
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (error) {
      throw new StorageValidationError('Local data is not valid JSON.', [String(error)]);
    }
    const originalVersion = isPlainObject(parsed) ? Number(parsed.schemaVersion ?? 1) : 1;
    const migrated = migrateStoredValue(parsed);
    if (originalVersion !== CURRENT_SCHEMA_VERSION) {
      await this.storage.setItem(this.key, JSON.stringify(migrated));
    }
    return migrated.data;
  }

  private async write(data: PersistedAppState): Promise<void> {
    await this.storage.setItem(this.key, JSON.stringify(this.envelope(data)));
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  load(): Promise<PersistedAppState> {
    return this.enqueue(() => this.read());
  }

  save(data: PersistedAppState): Promise<void> {
    return this.enqueue(() => this.write(data));
  }

  update(
    updater: (current: PersistedAppState) => PersistedAppState | Promise<PersistedAppState>,
  ): Promise<PersistedAppState> {
    return this.enqueue(async () => {
      const current = await this.read();
      const next = await updater(current);
      await this.write(next);
      return next;
    });
  }

  clear(): Promise<void> {
    return this.enqueue(() => this.storage.removeItem(this.key));
  }

  exportBundle(): Promise<ImportBundle> {
    return this.enqueue(async () => ({
      format: IMPORT_BUNDLE_FORMAT,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: await this.read(),
    }));
  }

  exportJson(pretty = true): Promise<string> {
    return this.exportBundle().then((bundle) => JSON.stringify(bundle, null, pretty ? 2 : 0));
  }

  import(input: string | unknown, mode: ImportMode = 'REPLACE'): Promise<PersistedAppState> {
    const bundle = parseImport(input);
    if (mode === 'REPLACE') return this.save(bundle.data).then(() => bundle.data);
    return this.update((current) => {
      const routinesByDate = { ...current.routinesByDate };
      for (const [dateKey, imported] of Object.entries(bundle.data.routinesByDate)) {
        const existing = routinesByDate[dateKey];
        if (!existing || existing.updatedAt <= imported.updatedAt) routinesByDate[dateKey] = imported;
      }
      return { ...current, routinesByDate };
    });
  }
}

export function parseImport(input: string | unknown): ImportBundle {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    if (input.length > MAX_IMPORT_BYTES) {
      throw new StorageValidationError('Import is larger than the supported 10 MB limit.');
    }
    try {
      parsed = JSON.parse(input);
    } catch (error) {
      throw new StorageValidationError('Import is not valid JSON.', [String(error)]);
    }
  }
  if (!isPlainObject(parsed) || parsed.format !== IMPORT_BUNDLE_FORMAT) {
    throw new StorageValidationError('Import is not a Miracle Morning backup.');
  }
  const migrated = migrateStoredValue({
    schemaVersion: parsed.schemaVersion,
    savedAt: parsed.exportedAt,
    data: parsed.data,
  });
  const bundle: ImportBundle = {
    format: IMPORT_BUNDLE_FORMAT,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt:
      typeof parsed.exportedAt === 'string' && Number.isFinite(new Date(parsed.exportedAt).getTime())
        ? parsed.exportedAt
        : new Date().toISOString(),
    data: migrated.data,
  };
  if (!validateImportBundle(bundle)) {
    throw new StorageValidationError('Import failed runtime validation.');
  }
  return bundle;
}

export const appRepository = new AppRepository();

export const loadPersistedData = (): Promise<PersistedAppState> => appRepository.load();
export const savePersistedData = (data: PersistedAppState): Promise<void> =>
  appRepository.save(data);
export const updatePersistedData = (
  updater: (current: PersistedAppState) => PersistedAppState | Promise<PersistedAppState>,
): Promise<PersistedAppState> => appRepository.update(updater);
export const clearPersistedData = (): Promise<void> => appRepository.clear();
export const exportData = (pretty = true): Promise<string> => appRepository.exportJson(pretty);
export const importData = (
  input: string | unknown,
  mode: ImportMode = 'REPLACE',
): Promise<PersistedAppState> => appRepository.import(input, mode);
