# Why SQLite with SQLx for Desktop

## Decision

We chose **SQLite** with **SQLx** for persistent data storage in our Tauri desktop application's Rust backend.

## Rationale

### Why SQLite with SQLx

#### Embedded & Zero-Setup

SQLite is embedded, requires no separate server installation, and is fully portable. The database file is stored at `~/Library/Application Support/com.buildergroup.isshin/isshin.db`. This makes it ideal for desktop applications where users shouldn't need to manage database infrastructure.

#### Rust-Side Database Logic

We use SQLx directly in Rust rather than `tauri-plugin-sql`. Since our backend lives in Rust, keeping database logic there is more secure and scales better. All database operations go through Tauri commands rather than exposing database access to the frontend, providing better security and control.

#### Flexibility & Power

SQLite provides the flexibility and power of a real database while being lightweight. It's suitable for long-term and larger datasets that need querying, relationships, and transactions.

#### Migration Management

Migrations are stored in `src-tauri/migrations/` and run automatically on application startup, ensuring the database schema stays in sync with the codebase.

## Storage Strategy

We use a tiered approach for different types of data:

- **LocalStorage**: UI preferences that are not critical; things the user wouldn't mind losing
- **`tauri-plugin-store`**: Backend preferences that are somewhat critical, like API keys or license keys; gives more control over storage
- **SQLite (via SQLx)**: Long-term and larger datasets; provides the flexibility and power of a real database while being embedded, zero-setup, and fully portable

## Alternatives Considered

- **`tauri-plugin-sql`**: Exposes database access to the frontend, which is less secure. Our backend lives in Rust, so keeping database logic there is more appropriate.
- **PostgreSQL**: Not embeddable - users would need to install and run a separate server, which is impractical for a desktop app. See [discussion](https://github.com/tauri-apps/tauri/discussions/5418).
