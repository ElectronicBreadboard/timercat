# Focus Profile

Reusable blocking/allowing configurations for focus sessions.

```
focus_profile
  ├── focus_profile_rule (action, target)        ×N
  ├── focus_profile_schedule (mode, days, time)  ×N
  └── session_focus_profile (priority)           ×N → session
```

## Rules

**Rule** = action + target

- Action: `block` or `allow`
- Target: specific app, specific website, or "all"

### App vs Website

Two independent layers:

| Rule Type | Controls                 | Example                                     |
| --------- | ------------------------ | ------------------------------------------- |
| App       | Can you open this app?   | Block Brave → can't open Brave              |
| Website   | Can you access this URL? | Block youtube.com → blocked in ALL browsers |

**Key insight**: Blocking an app blocks everything inside it. Blocking a website blocks it everywhere.

- Block Brave → youtube.com inaccessible via Brave (app is blocked), but reachable via Chrome
- Block youtube.com → blocked in Chrome, Brave, Safari, everywhere

### Why flat rules instead of modes (blocklist/allowlist)?

Modes don't compose. If you assign a "blocklist profile" and an "allowlist profile" to the same session, what happens? Unclear.

Rules are flat, self-contained entries — each carries its own action. Every rule is just "block X" or "allow X". No container or mode on the profile needed. Priority decides conflicts.

### Why "all" as a target?

Enables whitelist pattern without special mode:

- "Block All" profile (one rule: block all) at priority 0
- "Allowed Apps" profile (allow rules) at priority 1
- Result: only allowed apps work

Also enables "break mode": "Allow All" profile at highest priority overrides everything.

### Constraints

- One rule per target per profile (can't have "block X" and "allow X" in same profile)
- Rule targets ONE of: app, website, or all (not multiple)

## Schedule

**Schedule entry** = mode + days + time window

- Mode: `always_on` or `sessions_only`
- Days: which days of the week
- Time window: start time and end time

No schedule entries = manual-only profile.

### Activation Modes

A profile activates in one of three ways:

| Mode          | Schedule required? | How it works                                                 |
| ------------- | ------------------ | ------------------------------------------------------------ |
| Always on     | Yes                | Rules apply continuously during scheduled times              |
| Sessions only | Yes                | Auto-selected when starting a session during scheduled times |
| Manual        | No                 | User picks the profile when starting a session               |

- **Always on**: No session needed. During the scheduled window, the profile's rules are enforced automatically.
- **Sessions only**: Profile is auto-selected when the user starts a focus session during the scheduled window. Outside the window or without a session, nothing happens.
- **Manual**: No schedule. The user explicitly picks this profile when starting a session. A profile with a schedule can also be manually selected outside its window.

Each entry carries its own mode, so the same profile can be "always on" on weekdays and "sessions only" on weekends.

### Why flat entries?

Same reasoning as rules. Schedule entries are flat, self-contained rows — each carries its own mode. No container needed.

A shared "schedule mode" on the profile would force all time windows to behave the same. Flat entries are simpler and more flexible.

### Edge Cases

- **Overlapping profiles**: Two profiles scheduled for the same window — resolved via priority (existing `session_focus_profile.priority`). For "always on" profiles, all active profiles' rules stack.
- **Session during "always on" window**: The profile is already active, session inherits it naturally.
- **Manual selection outside schedule**: Always allowed. Schedule is additive, not restrictive.

## Sessions

A session has one or more profiles assigned, each with a priority number.

**Resolution**: When checking if an app/website is blocked:

1. Collect all matching rules from assigned profiles
2. Rule from highest priority profile wins
3. Same priority? `block` wins (fail-safe)
4. No matching rule? Allowed (default)

### Why priority on assignment, not profile?

Flexibility. Same "Block All" profile can be priority 0 in one session, priority 5 in another.

### Patterns

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
