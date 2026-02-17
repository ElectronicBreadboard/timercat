# Rust Feature Structure

How to organize a feature module in our Tauri apps.

## File Structure

```
feature/
├── mod.rs          # Module exports, setup/exit hooks
├── commands.rs     # Handlers + conversions + local params
├── types.rs        # Shared types (DTOs, Events, State)
├── repository.rs   # Database layer + Row/Input types
└── [domain].rs     # Complex business logic (optional)
```

## When to Create Each File

| File            | Create when...                                   |
| --------------- | ------------------------------------------------ |
| `mod.rs`        | Always                                           |
| `commands.rs`   | Feature has Tauri commands                       |
| `types.rs`      | Feature has DTOs, Events, State, or shared types |
| `repository.rs` | Feature has database operations                  |
| `[domain].rs`   | Feature has complex business logic               |

### When to Create a Domain File

Create `[domain].rs` (e.g., `timer.rs`, `session.rs`) when you have business logic beyond structural conversions. For simple CRUD features, skip it.

## File Contents

### mod.rs

Start with a one-line doc comment describing what this feature does. This is the entry point — it should tell you the scope at a glance.

```rust
//! Manages shopping cart: add/remove items, compute totals, apply discounts.

pub mod commands;
pub mod repository;
pub mod types;

// Optional: setup/exit hooks
pub fn setup(app: &App) { ... }
pub fn exit(app: &AppHandle) { ... }
```

### types.rs

Shared/external types only. No repository imports, no conversion impls.

Contains:

- **DTOs** - returned to frontend
- **Events** - pushed to frontend
- **State** - app-wide runtime state
- **Shared enums/types** - used across multiple files

Self-contained impls are OK (e.g., `as_str()`, `from_str()` for enums).

```rust
use serde::{Deserialize, Serialize};

// Shared enums - self-contained impls OK

pub enum Action { Block, Allow }

impl Action {
    pub fn as_str(&self) -> &'static str { ... }
    pub fn from_str(s: &str) -> Option<Self> { ... }
}

// MARK: - DTO

#[derive(Debug, Clone, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ItemDto { ... }

// MARK: - Event

#[derive(Debug, Clone, Serialize, specta::Type, tauri_specta::Event)]
pub struct ItemCreatedEvent(pub ItemDto);

// MARK: - State

pub type MyFeatureState = Arc<Mutex<MyFeature>>;
```

### commands.rs

Handlers, conversions, and local types. This is the glue layer between types and repository.

```rust
use super::repository::{ItemRepository, ItemRow};
use super::types::ItemDto;

// MARK: - Commands

#[tauri::command]
#[specta::specta]
pub async fn get_items(...) -> Result<Vec<ItemDto>, String> { ... }

#[tauri::command]
#[specta::specta]
pub async fn search(params: SearchParams) -> Result<Vec<SearchResultDto>, String> { ... }

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchParams { ... }

// MARK: - Conversions

impl From<ItemRow> for ItemDto {
    fn from(row: ItemRow) -> Self { ... }
}
```

**Local types placement:**

- Function params/returns → right under the function
- Impl helper types → below the impl block
- Shared types → types.rs

### repository.rs

Repository impl first, then Row/Input types.

```rust
use super::types::{...};  // for shared domain types (enums, etc.)

// MARK: - Repository

pub struct ItemRepository;

impl ItemRepository {
    pub async fn create(...) -> Result<ItemRow, sqlx::Error> { ... }
    pub async fn get(...) -> Result<Option<ItemRow>, sqlx::Error> { ... }
    pub async fn get_all(...) -> Result<Vec<ItemRow>, sqlx::Error> { ... }
    pub async fn update(...) -> Result<ItemRow, sqlx::Error> { ... }
    pub async fn delete(...) -> Result<(), sqlx::Error> { ... }
}

// MARK: - Row

#[derive(Debug, FromRow)]
pub struct ItemRow { ... }

// MARK: - Input

pub struct CreateItemInput { ... }
pub struct UpdateItemInput { ... }
```

### [domain].rs (optional)

For complex business logic that goes beyond structural conversions.

Create when you have:

- Computed properties (`compute_overtime_seconds()`)
- State machines or lifecycle management
- Business rules, validation logic
- Logic that deserves unit tests

```rust
// Domain types at top

pub enum Phase { Work, ShortBreak, LongBreak }
pub enum Status { Active, Completed, Cancelled }

pub struct Session { ... }

impl Session {
    pub fn from_db(...) -> Self { ... }
    pub fn compute_paused_seconds(&self, now: i64) -> u32 { ... }
    pub fn compute_overtime_seconds(&self, now: i64) -> u32 { ... }
}

// MARK: - Tests

#[cfg(test)]
mod tests { ... }
```

**Structural vs Business Logic:**

- `impl From` (field mapping) → commands.rs
- `compute_overtime_seconds()` (business logic) → [domain].rs

## Type Naming

| Type   | Suffix    | Location      | Purpose                   |
| ------ | --------- | ------------- | ------------------------- |
| DTO    | `*Dto`    | types.rs      | Returned to frontend      |
| Event  | `*Event`  | types.rs      | Pushed to frontend        |
| State  | `*State`  | types.rs      | Runtime state             |
| Params | `*Params` | commands.rs   | Received from frontend    |
| Row    | `*Row`    | repository.rs | Database row mapping      |
| Input  | `*Input`  | repository.rs | Internal repository input |

## Dependencies

```
commands.rs ──imports──> types.rs
commands.rs ──imports──> repository.rs
repository.rs ──imports──> types.rs (for shared types only)
```

**Never:**

- `types.rs` imports from `repository.rs`
- `types.rs` imports from `commands.rs`
- `repository.rs` imports from `commands.rs`

## Conversion Pattern

Conversions live in `commands.rs` using `impl From`:

- `Row → DTO` (database to frontend)
- `Params → Input` (frontend to database)

```rust
// commands.rs

impl From<FooRow> for FooDto {
    fn from(row: FooRow) -> Self { ... }
}

impl From<FooParams> for CreateFooInput {
    fn from(params: FooParams) -> Self { ... }
}

// Use TryFrom when conversion can fail (e.g., parsing enums from strings)
impl TryFrom<BarRow> for BarDto {
    type Error = ();
    fn try_from(row: BarRow) -> Result<Self, Self::Error> { ... }
}
```

**Prefer `impl From`** (idiomatic Rust) over `from_row()` methods.

This keeps:

- `types.rs` pure (no repo dependency)
- `commands.rs` as the glue layer between types and repository

## Examples

### Simple CRUD (focus_profile)

```
focus_profile/
├── mod.rs
├── types.rs        # FocusProfileDto, RuleAction, RuleTargetDto
├── commands.rs     # CRUD handlers + FocusProfileRuleParams + impl From conversions
└── repository.rs   # FocusProfileRow, CreateFocusProfileInput, FocusProfileRuleInput
```

- `FocusProfileRuleParams` in commands.rs, `FocusProfileRuleInput` in repository.rs
- `RuleAction`, `RuleTargetDto` in types.rs (shared domain types)

### Search Feature (app)

```
app/
├── mod.rs
├── types.rs        # App, Website, SearchResultDto, AppSearchState
├── commands.rs     # search handler + SearchParams + impl From conversion
└── search.rs       # AppSearch logic
```

- `SearchParams` in commands.rs because only used there
- `SearchResultDto` in types.rs because it's a DTO (returned to frontend)

### Complex Feature (session)

```
session/
├── mod.rs          # setup/exit hooks
├── types.rs        # SessionSummaryDto, SessionDetailDto, SessionCompletedEvent
├── commands.rs     # get_session handlers + impl From/TryFrom conversions
├── repository.rs   # SessionRow, SessionEventRow
└── session.rs      # Session domain model, Phase, Status, compute methods
```

- Business enums (Phase, Status) in session.rs with domain model
- Computed logic (`compute_overtime_seconds`) in session.rs
- `impl TryFrom<SessionRow>` in commands.rs (can fail on enum parsing)

### Feature with State (timer)

```
timer/
├── mod.rs
├── types.rs        # TimerDto, TimerState, TimerUpdatedEvent
├── commands.rs     # start_timer, pause_timer handlers + impl From<&Timer>
└── timer.rs        # Timer domain logic
```
