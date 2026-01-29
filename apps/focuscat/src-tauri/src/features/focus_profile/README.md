# Focus Profile

Reusable blocking/allowing configurations for focus sessions.

## How It Works

**Profile** = named collection of rules (e.g., "No Social Media", "Coding Only")

**Rule** = action + target
- Action: `block` or `allow`
- Target: specific app, specific website, or "all"

**Session** = has one or more profiles assigned, each with a priority number

**Resolution**: When checking if an app/website is blocked:
1. Collect all matching rules from assigned profiles
2. Rule from highest priority profile wins
3. Same priority? `block` wins (fail-safe)
4. No matching rule? Allowed (default)

## App vs Website Rules

Two independent layers:

| Rule Type | Controls | Example |
|-----------|----------|---------|
| App | Can you open this app? | Block Brave → can't open Brave |
| Website | Can you access this URL? | Block youtube.com → blocked in ALL browsers |

**Key insight**: Blocking an app blocks everything inside it. Blocking a website blocks it everywhere.

- Block Brave → youtube.com inaccessible via Brave (app is blocked), but reachable via Chrome
- Block youtube.com → blocked in Chrome, Brave, Safari, everywhere

## Why This Design

### Why rules instead of modes (blocklist/allowlist)?

Modes don't compose. If you assign a "blocklist profile" and an "allowlist profile" to the same session, what happens? Unclear.

Rules compose cleanly. Every rule is just "block X" or "allow X". Priority decides conflicts.

### Why "all" as a target?

Enables whitelist pattern without special mode:
- "Block All" profile (one rule: block all) at priority 0
- "Allowed Apps" profile (allow rules) at priority 1
- Result: only allowed apps work

Also enables "break mode": "Allow All" profile at highest priority overrides everything.

### Why priority on assignment, not profile?

Flexibility. Same "Block All" profile can be priority 0 in one session, priority 5 in another.

## Patterns

```
Blocklist:   "No Social Media" (blocks twitter, facebook)
             → those sites blocked, everything else allowed

Exception:   "No Social Media" (pri 0) + "Allow Twitter" (pri 1)
             → facebook blocked, twitter allowed

Whitelist:   "Block All" (pri 0) + "Coding Apps" (pri 1)
             → only coding apps allowed, rest blocked

Break:       "Allow All" (pri 99)
             → overrides everything, all allowed
```

## Schema Constraints

- One rule per target per profile (can't have "block X" and "allow X" in same profile)
- Rule targets ONE of: app, website, or all (not multiple)

## Future

- **Schedule**: Auto-apply profiles at specific times/days
