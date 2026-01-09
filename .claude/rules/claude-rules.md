---
description: Structure and authoring conventions for Claude Code rules and memory
alwaysApply: false
---

# Claude Code Rules Documentation

Claude Code rules are markdown files that provide AI-friendly documentation about codebase patterns, conventions, and best practices. This guide covers Claude Code's memory system and how it differs from Cursor.

## Core Principles

- **Consistency** - Follow consistent structure and formatting
- **Clarity** - Use clear, specific language
- **Examples** - Provide practical code examples
- **Brevity** - Keep rules concise (they load every session)

## Memory Hierarchy

Claude Code uses a 4-level memory system (highest to lowest priority):

| Level         | Location                                            | Scope                   |
| ------------- | --------------------------------------------------- | ----------------------- |
| Enterprise    | `/Library/Application Support/ClaudeCode/CLAUDE.md` | Organization-wide       |
| Project       | `./CLAUDE.md` or `./.claude/CLAUDE.md`              | Team (committed)        |
| Project Rules | `./.claude/rules/*.md`                              | Team (committed)        |
| User          | `~/.claude/CLAUDE.md`                               | Personal (all projects) |

## File Organization

### Directory Structure

- Always keep rules in `.claude/rules/` directory
- Always use `.md` extension (not `.mdc` like Cursor)
- Always use descriptive, kebab-case filenames

✅ Good:

```
.claude/
├── CLAUDE.md              # Main project memory (optional)
└── rules/
    ├── rust.md            # Rust conventions
    ├── typescript.md      # TypeScript conventions
    └── testing.md         # Testing patterns
```

❌ Bad:

```
.claude/
└── rules/
    ├── Rust.mdc           # Wrong: PascalCase, wrong extension
    ├── ts.md              # Wrong: Not descriptive
    └── rules/testing.md   # Wrong: Nested directory
```

### Frontmatter (Optional)

Claude Code supports YAML frontmatter for path-specific rules:

✅ Good:

```markdown
---
paths: src/**/*.rs
---

# Rust Rules

These rules only apply when working with Rust files.
```

✅ Also Good (applies everywhere):

```markdown
---
description: General coding standards
---

# Coding Standards
```

### Path Filtering

Use glob patterns in `paths` frontmatter to scope rules:

```yaml
---
paths: src/**/*.ts # All TypeScript in src/
---
```

```yaml
---
paths: '**/*.{ts,tsx}' # All TypeScript/TSX files
---
```

```yaml
---
paths:
  - src/api/**/*
  - src/server/**/*
---
```

## Quick Commands

### During Conversation

- `/memory` - Open memory file in editor
- `/init` - Initialize project memory (creates CLAUDE.md)
- `#` - Quick-add a rule (Claude asks which file)

### Quick-Add Example

```
You: # Always use explicit return statements in Rust

Claude: Which memory file should I add this to?
1. Project (.claude/CLAUDE.md)
2. User (~/.claude/CLAUDE.md)
```

## Differences from Cursor

| Feature      | Cursor               | Claude Code             |
| ------------ | -------------------- | ----------------------- |
| Directory    | `.cursor/rules/`     | `.claude/rules/`        |
| Extension    | `.mdc`               | `.md`                   |
| Path filter  | `globs: ["**/*.rs"]` | `paths: "**/*.rs"`      |
| Quick-add    | Not available        | `#` prefix              |
| Edit command | Not available        | `/memory`               |
| Always apply | `alwaysApply: true`  | No frontmatter = always |

## Sharing Rules Between Tools

Use symlinks to share rules between Cursor and Claude Code:

```bash
# From .claude/rules/
ln -s ../../.cursor/rules/rust.mdc rust.md
```

This creates a single source of truth - edit in Cursor, both tools see changes.

## Best Practices

### Keep Rules Concise

Rules load every session, so avoid bloat:

✅ Good:

```markdown
# Rust Style

- Always use explicit `return` statements
- Always use `snake_case` for files and variables
- Always handle errors with `Result<T, E>`
```

❌ Bad:

```markdown
# Rust Style

This document contains our comprehensive Rust coding standards
that have been developed over many years of experience...

[500 lines of prose]
```

### Be Specific and Declarative

✅ Good:

```markdown
- Always use 2-space indentation
- Never use `any` type in TypeScript
- Always add trailing commas in multi-line structures
```

❌ Bad:

```markdown
- Try to keep code clean
- Maybe consider using types
- Format code nicely
```

### Use CLAUDE.md for Project Context

Put high-level project info in `CLAUDE.md`, specific rules in `rules/`:

```markdown
# CLAUDE.md

## Project Overview

Tauri desktop app for activity tracking.

## Tech Stack

- Rust (backend)
- TypeScript + React (frontend)
- SQLite (database)

## Key Commands

- `pnpm dev` - Start development
- `cargo test` - Run Rust tests
```
