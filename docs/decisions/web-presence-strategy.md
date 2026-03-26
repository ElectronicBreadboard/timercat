# Web Presence Strategy: focuscat.app + pomodorocat.com

## Decision

Split the web presence across two domains with distinct purposes:

- **focuscat.app** — Brand home and macOS app landing page
- **pomodorocat.com** — Web pomodoro timer, SEO-focused

Both are served from the same `web` codebase. Domain routing is handled via TanStack Router's `rewrite` option — browser URLs stay clean while the router internally maps to the correct route tree.

## Rationale

### Why two domains

`focuscat.app` is a brand name, not a keyword. It speaks to the macOS app product. It does not signal "pomodoro timer" to search engines or users scanning results.

`pomodorocat.com` contains the exact keyword ("pomodoro") plus the product differentiator ("cat"). It targets users actively searching for a pomodoro tool, which is the correct search intent for a web timer.

Keeping both in one repo avoids duplication — shared components, shared `App.tsx`, shared infrastructure.

### Why not more domains

Multiple domains split link authority. Two focused domains is the limit — any more dilutes SEO effort without meaningful return.

### The funnel

```
User searches "pomodoro cat" or "pomodoro timer"
  → lands on pomodorocat.com (web timer)
  → discovers the macOS app with the cat widget
  → downloads focuscat
```

The web timer is top-of-funnel for the macOS app, not a separate product.

### Realistic SEO expectations

Ranking for "pomodoro timer" (high competition) is unlikely short-term. The realistic targets are:

- "pomodoro cat"
- "pomodoro kitty"
- "cat pomodoro timer"
- Long-tail: "pomodoro timer for cat lovers", "cute pomodoro timer"

These are lower competition, correct intent, and aligned with the cat brand. Authority builds over time through Product Hunt, HN, Reddit, and content.

## Architecture

Routes in `web`:

```
routes/index.tsx                    → focuscat.app/
routes/help/                        → focuscat.app/help
routes/legal.*/                     → focuscat.app/legal/*
routes/sites.pomodorocat/           → pomodorocat.com/ (browser URL stays clean)
routes/sites.pomodorocat.[...]      → pomodorocat.com/* (browser URL stays clean)
```

`router.tsx` configures a `rewrite` with `input`/`output` functions that read `url.hostname`. The router internally routes `pomodorocat.com/*` → `/sites/pomodorocat/*` while the browser URL remains `pomodorocat.com/`. TanStack Router serializes `publicHref` correctly during SSR so client hydration has no mismatch.

Pomodorocat-specific components live in `src/app/sites/pomodorocat/`.

## Alternatives Considered

- **Single domain (focuscat.app only)** — Simpler, but the domain doesn't target any pomodoro keyword. Missed SEO opportunity.
- **Separate repos per domain** — Shared components would require package extraction. More maintenance overhead with no benefit.
- **Nitro middleware URL rewriting** — Does not work with TanStack Start SSR. The rewritten path gets baked into the dehydrated router state; on hydration the client router sees a mismatch between the browser URL and the state, and navigates to the internal path, leaking `/sites/pomodorocat` into the URL bar.
- **Hostname detection in root loader** — Works, but requires conditional rendering in every route component that needs to differ per domain. Becomes unmaintainable as pomodorocat grows its own pages.
