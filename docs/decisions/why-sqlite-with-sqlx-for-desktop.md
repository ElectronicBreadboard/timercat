# Why SQLite with SQLx for Desktop

## Decision

We chose **SQLite** with **SQLx** for persistent data storage in our Tauri desktop application's Rust backend.

## Rationale

### Why SQLite

#### Embedded & Zero-Setup

SQLite is embedded, requires no separate server installation, and is fully portable. The database file is stored at `~/Library/Application Support/com.buildergroup.focuscat/focuscat.db`. Users never need to manage database infrastructure.

#### Battle-Tested

SQLite is the most deployed database in the world - it's in every smartphone, browser, and countless desktop apps. It's not a toy database; it handles terabytes of data reliably.

#### Perfect for Desktop

- **Single-user**: No concurrent write contention issues
- **Local-first**: Data stays on device, no network latency
- **Portable**: Database is a single file, easy to backup/migrate

### Why SQLx

#### Compile-Time Query Verification

SQLx checks SQL queries at compile time against your actual database schema. Typos and schema mismatches are caught before runtime.

```rust
// This won't compile if the table/columns don't exist
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = ?", id)
    .fetch_one(&pool)
    .await?;
```

#### Migration Management

Migrations are stored in `src-tauri/migrations/` and run automatically on application startup via `sqlx::migrate!()`. The schema stays in sync with the codebase.

### Why Rust-Side Database Logic

We use SQLx directly in Rust rather than `tauri-plugin-sql` because:

1. **Security**: Database operations go through Tauri commands, not exposed to frontend
2. **Type Safety**: Rust's type system catches errors at compile time
3. **Performance**: No IPC overhead for complex queries
4. **Control**: Full access to SQLite pragmas and advanced features

## Storage Strategy

We use a tiered approach for different types of data:

| Storage              | Use Case                               | Example                        |
| -------------------- | -------------------------------------- | ------------------------------ |
| LocalStorage         | UI preferences, non-critical           | Theme, sidebar collapsed state |
| `tauri-plugin-store` | Backend preferences, somewhat critical | API keys, license keys         |
| SQLite (SQLx)        | Long-term data, relationships, queries | Activity logs, user data       |

## Trade-offs

### No Cloud Sync Built-in

SQLite is local-only. If we need sync, we'd add it separately (e.g., sync to backend API). This is intentional - local-first with optional sync is our architecture.

## Alternatives Considered

- **`tauri-plugin-sql`**: Exposes database access to the frontend, which is less secure. Our backend lives in Rust, so keeping database logic there is more appropriate.
- **PostgreSQL**: Not embeddable - users would need to install and run a separate server, which is impractical for a desktop app.
- **IndexedDB**: Browser-based, limited query capabilities, no compile-time checking.
