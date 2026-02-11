# Timer & Session Architecture

## Decision

**Timer manages Session.** The timer is the runtime (actor); the session is the persistence record (artifact). Timer creates, updates, and completes sessions. Session never imports or calls timer.

All timers are **countdown timers**. Different modes (Pomodoro, Progressive Pomodoro, Countdown) are flavors of the same concept: a timed block counting down to zero.

## Architecture

```
timer/commands.rs  →  session/repository.rs
     (runtime)            (persistence)
```

**Timer** owns the runtime: state machine, countdown, pause/resume, events, mode transitions.

**Session** owns persistence: DB operations, queries, types. It stores `session_type` (e.g. `pomodoro:work`) but doesn't know what drives it.

One-way dependency. Session is unaware of timer.

## Sessions

A **session** is a timed block regardless of mode. The `session_type` column describes the flavor:

- `pomodoro:work`, `pomodoro:short_break`, `pomodoro:long_break`
- Future: `progressive_pomodoro:work`, `countdown`, etc.

All sessions share the same shape: duration, start, end, events, optional intention. This keeps the schema universal and stats aggregation simple.

## Timer Modes

Mode-specific logic (what to start with, what comes next, how long) is isolated behind a trait. Shared logic (countdown tick, pause/resume, session creation/completion) stays in the timer commands.

Adding a new mode = implement the trait + add `SessionType` variants. No changes to session, runner, or shared timer logic.

## Why Timer → Session (not the reverse)

- **Causality**: Timer starts → session is created. Timer completes → session is completed. The runtime drives the record.
- **Simplicity**: One-way dependency is easier to reason about than bidirectional.
- **Session is passive**: It's a database record. It doesn't "do" anything at runtime.
- **Orchestrator overkill**: A mediator between timer and session adds indirection without value at this scale.
