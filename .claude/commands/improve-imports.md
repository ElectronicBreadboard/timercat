# Improve Rust Imports

Consolidate and organize imports when editing Rust files:

1. **Combine by path**: Merge imports from the same path into one `use` block.
   - `use super::{repository::X, resolution::Y, types::Z};` when multiple from same parent
   - `use crate::features::foo::{a, b, c};` when multiple from same crate path

2. **Order**: std first (blank line), then super/crate, then external crates.

3. **Run**: `cargo fmt` after edits.

4. **Avoid**: Wildcard imports (`use module::*`) except for test prelude.

5. **Direct import**: Prefer `use module::{a, b, c}` over `use module;` + `module::a` when you know what you need.
