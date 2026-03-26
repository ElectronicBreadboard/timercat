# Why Value-Based Settings Migration

## Decision

We chose **Value-based migration** for settings: parse JSON as a raw `serde_json::Value` tree, apply migrations that transform the tree step by step, then deserialize into `AppSettings`. One struct, no version-specific type definitions. Implementation lives in `apps/desktop/src-tauri/src/features/settings/persistence.rs`.

## Rationale

### Why Value-Based

#### One Source of Truth

`AppSettings` is the only struct that represents the current schema. Code always works with the latest type. When we add a field or rename one, we change `AppSettings` and add one migration function. We never maintain `AppSettingsV0`, `AppSettingsV1`, etc.

#### Flexible Migrations

Value transformations support rename, add, remove, and restructure. Serde aliases only handle renames. Versioned structs require defining the full schema per version.

#### Future-Safe

Adding a new version means: add the variant to `SettingsVersion`, update `current()`, add one migration function. Migrations are additive; no impact on existing code.

#### No Struct Accumulation

With versioned structs, each new version adds another struct. Value-based keeps one struct. Version structs are frozen snapshots; we don't update them when refactoring `AppSettings` — only the migration functions change.

### How It Works

```
Read file → Parse as Value → Read version from tree
    → While version != current: migrate_value_one_step(&mut value)
    → Deserialize Value into AppSettings
```

We migrate one step at a time (v1→v2, v2→v3) and loop until we reach current — never v1→v3 directly. Each `migrate_value_one_step` upgrades by one version and updates the version in the tree. Any valid JSON parses as `Value`. Final deserialization either succeeds or fails (migration bug or corrupt file; we fall back to defaults).

## Trade-offs

### No Type Safety During Migration

Migrations manipulate `Value` with `get_mut`, `as_object_mut`, `remove`, `insert`. Typos are only caught at runtime. We mitigate by using string constants for keys and keeping migrations small.

### Manual Value Manipulation

Migration code is more verbose than struct-based conversion. For settings, migrations are infrequent and usually simple (rename, add default, remove). The flexibility outweighs the verbosity.

### Reversible

If Value-based migrations prove problematic (e.g. repeated typos, complex restructures), we can switch to versioned structs. The on-disk format stays the same; only the load implementation changes. See "How to Switch to Versioned Structs" below.

## Alternatives Considered

- **Serde aliases**: `#[serde(alias = "oldName")]` on fields. Accepts old names when deserializing. Only handles renames; cannot add, remove, or restructure. Rejected for lack of flexibility.
- **Versioned structs + tagged enum**: Use `#[serde(tag = "version")]` so serde matches on the version field explicitly. Type-safe deserialization; compiler catches migration mistakes. Same step-by-step migration pattern: v1→v2, v2→v3, recurse until `Latest`. Rejected for the accumulation of structs.

## How to Switch to Versioned Structs

If we change our mind, the on-disk format stays the same. Only the load implementation changes.

1. **Define version structs** — One struct per version, matching the on-disk schema for that version. Add `#[serde(rename_all = "camelCase")]` and `#[serde(default)]` as needed.

2. **Define the enum** — `#[serde(tag = "version")]` with variants for each version. Include `Latest(AppSettings)` for the current format.

3. **Replace the load flow** — Deserialize into the enum, then call `migrate_to_current(versioned)` which recurses one step at a time:

```rust
#[serde(tag = "version")]
enum AppSettingsVersions {
    #[serde(rename = "0.0.1")]
    V0_0_1(AppSettingsV0_0_1),
    #[serde(rename = "0.0.2")]
    V0_0_2(AppSettingsV0_0_2),
    #[serde(rename = "0.0.3")]
    Latest(AppSettings),
}

fn migrate_to_current(versioned: AppSettingsVersions) -> AppSettings {
    match versioned {
        AppSettingsVersions::V0_0_1(v) => migrate_to_current(AppSettingsVersions::V0_0_2(migrate_v0_0_1_to_v0_0_2(v))),
        AppSettingsVersions::V0_0_2(v) => migrate_to_current(AppSettingsVersions::Latest(migrate_v0_0_2_to_v0_0_3(v))),
        AppSettingsVersions::Latest(s) => s,
    }
}
```

4. **Port existing migrations** — Each `migrate_vX_to_vY` in the Value approach becomes a function that takes the old struct and returns the new struct. The compiler enforces completeness.
