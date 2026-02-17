# Project Structure

How we organize code across frontend and backend.

## Philosophy

Group code into **self-contained vertical slices** called features. Each feature owns everything it needs — UI, logic, state, data access — in one place. Shared/global code lives at the root level, organized by type.

This pattern works across languages and frameworks — the same mental model applies to React, Rust, Swift, Hono, etc. Directory names adapt to language conventions but the structure stays the same.

## Root Layout

Both frontend and backend follow the same top-level structure:

```
src/
├── environment/    # Singletons: config, DB, constants
├── lib/ (common/)  # Shared utilities and helpers
├── features/       # Vertical slices (see below)
└── [app-specific]  # Framework entry points
```

The app-specific directory varies by context:

| Context  | Directory     | Contains                    |
| -------- | ------------- | --------------------------- |
| Frontend | `routes/`     | Route components            |
| Backend  | `app/`        | App lifecycle, entry points |
| Frontend | `components/` | Shared UI components        |
| Frontend | `hooks/`      | Shared hooks                |

### environment/

Things that exist once and are global: config values, DB instance, logger, API keys. Not business logic.

### lib/ (Rust: common/)

Shared utilities used across features. Named `common/` in Rust because `lib` is a reserved concept (`src/lib.rs` is the crate root). Keep this thin — if a utility is only used by one feature, it belongs in that feature.

### features/

Self-contained vertical slices. Each one is a bounded area of concern. Not all are user-facing "features" in the product sense — some are system capabilities (e.g., permissions, notifications). The name is a convention, not a strict definition.

**Every feature's entry file starts with a one-line description of what it does.** This makes navigation instant — you can read `mod.rs` / `index.ts` to understand scope without opening other files.

```rust
//! Manages user notifications: scheduling, delivery, read state, preferences.
```

```typescript
// Manages user notifications: scheduling, delivery, read state, preferences.
```

## Features

### Structure Mirrors the Root

A feature can have the same directories as the root, scoped to that feature. Only create what's needed — small features might just be a few files.

**Frontend example — a large feature:**

```
features/cart/
├── components/     # Feature-specific UI
├── hooks/          # Feature-specific hooks
├── lib/            # Feature-specific utilities
├── CartCx.tsx      # Feature context/state
└── index.ts        # Public exports
```

**Frontend example — a small feature:**

```
features/theme/
├── ThemeCx.tsx
└── index.ts
```

**Rust example:**

```
features/cart/
├── mod.rs          # Exports, setup/exit hooks
├── commands.rs     # API handlers + conversions
├── types.rs        # DTOs, Events, State
├── repository.rs   # Database layer
└── [domain].rs     # Business logic (optional)
```

See [rust-feature-structure.md](./rust-feature-structure.md) and [frontend-feature-structure.md](./frontend-feature-structure.md) for language-specific conventions.

### Cross-Feature Imports

Features can import from each other — they're not isolated micro-services. The interface is whatever the feature exports via `index.ts` / `mod.rs`.

The rule is simple: **everything that belongs to a feature lives inside that feature.** If feature A needs something from feature B, it imports from B's public exports. If the same utility is needed by many features and doesn't belong to any one of them, lift it to root `lib/`.

### Routes vs Features

Routes are navigation destinations — they compose features but don't own domain logic. A route imports from features and wires them together for a specific screen.

Put something in a **feature** when it's reusable across routes (components, hooks, state). Put something in a **route** when it's specific to one screen and has no reuse value.

### When Code Goes in Root vs Feature

| Question                             | Answer                   |
| ------------------------------------ | ------------------------ |
| Used by multiple features?           | Root                     |
| Used by one feature only?            | Feature                  |
| Global singleton (DB, config)?       | `environment/`           |
| Shared utility (formatting, dates)?  | `lib/`                   |
| Shared UI component (Button, Input)? | `components/`            |
| Feature-specific component?          | `features/x/components/` |
| Feature-specific hook?               | `features/x/hooks/`      |

### Scaling

Features can nest the same structure deeper. A large feature may have domain-specific subdirectories (e.g., `nodes/`, `mixins/`) that themselves contain `components/`, `lib/`, etc. This is fine — the pattern is recursive.

If an app only has one feature (e.g., an editor app where the editor _is_ the product), it's still worth wrapping it in `features/` for consistency across projects.

### Naming

| Language   | Directories  | Shared utils | Example          |
| ---------- | ------------ | ------------ | ---------------- |
| TypeScript | `kebab-case` | `lib/`       | `focus-profile/` |
| Rust       | `snake_case` | `common/`    | `focus_profile/` |
| Swift      | `PascalCase` | `Lib/`       | `FocusProfile/`  |

Feature names should match across frontend and backend where applicable.
