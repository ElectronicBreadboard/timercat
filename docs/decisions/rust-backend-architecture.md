# Rust Backend Architecture

## Decision

We use a **fat commands** pattern with **pure domain models** for our Tauri backend. This is not OOP - it's data + functions with clear separation of concerns.

## Architecture Overview

```
features/<feature>/
├── commands.rs    # Tauri commands (orchestration)
├── repository.rs  # Raw DB operations
├── <domain>.rs    # Domain model + compute logic
├── types.rs       # State, Events, DTOs
└── mod.rs
```

## Core Patterns

### 1. Fat Commands (Orchestration)

Commands are the entry point. They orchestrate: **extract → DB → update → emit**.

```rust
#[tauri::command]
pub async fn pause_timer(
    app: AppHandle,
    state: State<'_, TimerState>,
    db: State<'_, DatabaseState>,
) -> Result<(), String> {
    let now = Utc::now().timestamp();

    // 1. Extract data from state
    let session_id = {
        let timer = state.lock().unwrap();
        timer.session.as_ref().map(|s| s.id)
    };

    // 2. DB operation
    let event = SessionEvent::Paused { timestamp: now };
    if let Some(id) = session_id {
        SessionRepository::insert_event(&db.pool, id, &event)
            .await
            .map_err(db_err)?;
    }

    // 3. Update state
    let timer = {
        let mut timer = state.lock().unwrap();
        if let Some(session) = &mut timer.session {
            session.add_event(event);
        }
        timer.status = TimerStatus::Paused;
        timer.clone()
    };

    // 4. Emit event
    let _ = TimerUpdatedEvent(timer).emit(&app);
    return Ok(());
}
```

**Why this pattern:**

- Single timestamp at top ensures consistency
- Lock scopes are minimal (extract, update)
- DB operations happen outside locks
- Clear flow makes debugging easy

### 2. Pure Domain Models

Domain models (e.g., `Session`) hold data and compute logic. They know nothing about DB or Tauri.

```rust
// session/session.rs
pub struct Session {
    pub id: i64,
    pub phase: Phase,
    pub events: Vec<SessionEvent>,
    // ...
}

impl Session {
    pub fn new(id: i64, phase: Phase, ...) -> Self { ... }

    /// Construct from database fields.
    pub fn from_db(id: i64, phase: &str, ...) -> Option<Self> { ... }

    /// Compute total paused time in seconds.
    pub fn compute_paused_seconds(&self, current_time: i64) -> u32 { ... }

    /// Compute actual focused time (excludes pauses).
    pub fn compute_actual_seconds(&self, current_time: i64) -> u32 { ... }
}
```

**Rules:**

- Domain models are pure data + compute methods
- Methods only operate on `self` data
- No DB calls, no Tauri dependencies
- `from_db` takes raw fields (not DB types) to stay independent

### 3. Repository (Raw DB)

Repository does raw SQL operations. Returns `Result<T, sqlx::Error>`.

```rust
// session/repository.rs
pub struct SessionRepository;

impl SessionRepository {
    pub async fn create(pool: &SqlitePool, ...) -> Result<Session, sqlx::Error> { ... }
    pub async fn complete(pool: &SqlitePool, ...) -> Result<(), sqlx::Error> { ... }
    pub async fn get_by_id(pool: &SqlitePool, id: i64) -> Result<Option<SessionRow>, sqlx::Error> { ... }
}
```

**Rules:**

- No business logic, just CRUD
- Returns raw rows or domain objects
- Commands handle error mapping to strings

### 4. Types (State + Events + DTOs)

The `types.rs` file contains:

- **State wrappers** (e.g., `TimerState`) - Mutex wrappers for Tauri managed state
- **Events** - Tauri events for frontend notifications
- **DTOs** - Data transfer objects for API responses

```rust
// timer/types.rs

// Events
#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
pub struct TimerUpdatedEvent(pub Timer);

// State
pub struct TimerState(Mutex<Timer>);

impl TimerState {
    pub fn init(app: &App) -> Self { ... }
}

impl Deref for TimerState {
    type Target = Mutex<Timer>;
    fn deref(&self) -> &Self::Target { &self.0 }
}
```

DTOs go in feature-specific types:

```rust
// session/types.rs

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SessionSummaryDto { ... }

#[derive(Debug, Clone, Serialize, specta::Type)]
pub struct SessionDetailDto { ... }
```

### 5. Domain-Specific Types in Domain File

Types that are core to a domain model live with the model:

```rust
// timer/timer.rs
pub struct Timer { ... }
pub struct TimerConfig { ... }
pub enum TimerStatus { Idle, Running, Paused }
pub struct WorkSessionStats { ... }

// session/session.rs
pub struct Session { ... }
pub enum Phase { Work, ShortBreak, LongBreak }
pub enum SessionStatus { Active, Completed, Cancelled }
pub enum SessionEvent { Started, Paused, Resumed, ... }
```

## What This Is NOT

### Not OOP

We don't have:

- Inheritance hierarchies
- Services with injected dependencies
- Abstract factories or dependency injection
- Objects that "do things" to other objects

We have:

- Data structs with associated functions
- Pure compute methods
- Commands that orchestrate

### Not Anemic Domain Model

Domain models aren't just data bags. They have:

- Constructors (`new`, `from_db`)
- Compute methods (`compute_paused_seconds`, `compute_actual_seconds`)
- Serialization helpers (`as_str`, `from_str`)

### Not Service Layer

We don't have a "service" layer between commands and repository. Commands ARE the service - they orchestrate everything. This is simpler and avoids unnecessary indirection.

## File Organization

Each feature follows the same structure:

| File            | Purpose                       |
| --------------- | ----------------------------- |
| `commands.rs`   | Tauri commands (entry points) |
| `repository.rs` | Raw DB operations             |
| `<domain>.rs`   | Domain model + compute logic  |
| `types.rs`      | State, Events, DTOs           |
| `mod.rs`        | Module exports + setup        |

## Testing

- **Domain models**: Unit test compute methods (pure functions)
- **Commands**: Integration test with test database
- **Repository**: Test via command integration tests

```rust
// session/session.rs
#[cfg(test)]
mod tests {
    #[test]
    fn test_compute_paused_seconds_single_pause() {
        let mut session = make_session();
        session.add_event(SessionEvent::Paused { timestamp: 1100 });
        session.add_event(SessionEvent::Resumed { timestamp: 1200 });
        assert_eq!(session.compute_paused_seconds(1500), 100);
    }
}
```

## Trade-offs

### Commands Can Get Long

Fat commands can be 50+ lines. This is intentional - all the logic for one operation is in one place. Use `// MARK: -` sections to organize.

### Some Duplication in Commands

Similar patterns repeat across commands (extract → DB → update → emit). This is acceptable - the pattern is clear and each command is self-contained.

## Alternatives Considered

- **Service Layer**: Adds indirection without clear benefit. Commands already orchestrate.
- **OOP with Dependency Injection**: Over-engineering for our scale. Harder to understand.
- **Thin Commands + Fat Services**: Splits related logic across files. Harder to trace flow.
