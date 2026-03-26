# Focus Profile

Reusable configurations that categorize apps and websites. A global threshold decides what gets blocked.

```
focus_profile
  ├── focus_profile_category (target, category)  xN
  ├── focus_profile_schedule (mode, days, time)  xN
  └── session_focus_profile (priority)           xN -> session

app_setting: profiles.block_threshold
```

## Categories

Each app/website in a profile gets a category:

- `focused` — helps you work
- `neutral` — neither helps nor hurts (default for uncategorized)
- `distracting` — pulls you away

## Category Assignments

Each assignment targets either **All** apps/websites or **Specific** ones (multi-select).

One assignment per target per profile.

## Global Blocking Threshold

One app-level setting. Applied whenever any profile is active.

- `none` — do not block anything
- `distracting` — block Distracting only
- `neutral` — block Neutral and Distracting

No active profile = everything allowed.

## Activation Modes

| Mode           | Schedule | Session | Behavior                                     |
| -------------- | -------- | ------- | -------------------------------------------- |
| `always_on`    | Yes      | No      | Applies continuously during scheduled window |
| `pre_selected` | Yes      | Yes     | Auto-added to session setup, user can remove |
| `manual`       | No       | Yes     | User picks when starting a session           |

No schedule entries = manual only. Entries can mix modes (e.g. always_on weekdays, pre_selected weekends).

## Session Setup

- `always_on` profiles active in the current window: shown, not removable
- `pre_selected` profiles active in the current window: shown, removable
- Manual profiles: user adds from list

Profiles can be reordered. Higher position = higher priority.

## Multi-Profile Composition

Multiple profiles can be active at once. Higher priority wins, always.

**Resolution**: find the highest-priority profile that assigns a category to the target. Apply global threshold.

### Examples

```
Blocklist (threshold: distracting):
  "No Social": youtube.com -> Distracting, twitter.com -> Distracting
  Result: social blocked, everything else neutral -> allowed

Whitelist (threshold: distracting):
  "Base" (p0): All -> Distracting
  "Dev Tools" (p1): Xcode, Terminal -> Focused
  Result: Xcode/Terminal allowed, everything else blocked

Exception (threshold: distracting):
  "No Social" (p0): twitter.com -> Distracting
  "Allow Twitter" (p1): twitter.com -> Neutral
  Result: p1 wins -> twitter.com neutral -> allowed
```
