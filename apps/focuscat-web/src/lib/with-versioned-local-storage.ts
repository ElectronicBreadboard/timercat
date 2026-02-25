import {
	FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER,
	withStorage,
	type TPersistFeature,
	type TState,
	type TStorageInterface
} from 'feature-state';

export function withVersionedLocalStorage<GValue extends { version: string }>(
	baseState: TState<GValue, []>,
	key: string,
	migrationConfig: TVersionedMigrationConfig<GValue>
): TState<GValue, [TPersistFeature]> {
	return withStorage(baseState, new VersionedLocalStorageInterface(migrationConfig), key);
}

// MARK: - VersionedLocalStorageInterface

export class VersionedLocalStorageInterface<
	GValue extends { version: string }
> implements TStorageInterface<GValue> {
	private readonly _config: TVersionedMigrationConfig<GValue>;

	constructor(config: TVersionedMigrationConfig<GValue>) {
		this._config = config;
	}

	public save(key: string, value: GValue): boolean {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	}

	public load(key: string): GValue | typeof FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER {
		const item = localStorage.getItem(key);
		if (item == null) {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}

		// Parse loaded local storage item
		let value: unknown;
		try {
			value = JSON.parse(item) as unknown;
		} catch {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
		if (value == null || typeof value !== 'object') {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}

		// Extract version from parsed value
		const version = (value as { version?: string }).version;
		if (version == null) {
			return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
		}
		let current = value as GValue;
		let currentVersion: string = version;

		// Run migration chain until latest
		while (currentVersion !== this._config.latestVersion) {
			const migration = this._config.migrations[currentVersion];
			if (migration == null) {
				return FAILED_TO_LOAD_FROM_STORAGE_IDENTIFIER;
			}

			// Apply migration
			current = migration.migrate(current) as GValue;
			current.version = migration.to;

			// Save updated value
			this.save(key, current);

			currentVersion = migration.to;
		}

		return current as GValue;
	}

	public delete(key: string): boolean {
		localStorage.removeItem(key);
		return true;
	}
}

export interface TVersionedMigrationConfig<GValue extends { version: string }> {
	latestVersion: GValue['version'];
	migrations: Record<string, TVersionedMigration<unknown, unknown>>;
}

export interface TVersionedMigration<GFrom, GTo> {
	to: string;
	migrate: (value: GFrom) => GTo;
}
