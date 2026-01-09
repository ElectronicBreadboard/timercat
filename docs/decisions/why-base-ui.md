# Why Base UI

## Decision

We chose **Base UI** over **Radix UI** as our unstyled component library foundation.

## Rationale

### Why Base UI

#### Active Maintenance & Long-term Viability

Base UI is created by the **same people who built Radix UI**. After WorkOS acquired Radix, the core team left and started Base UI as a joint venture with the Material UI and Floating UI teams.

- **Base UI v1.0** released December 2025 - production ready
- **Radix UI** has accumulated years of unresolved bugs and tech debt after the team departure

#### Backed by Experienced Team

Base UI comes from the creators of:

- Radix UI (unstyled primitives)
- Material UI (most popular React component library)
- Floating UI (positioning engine)

This combined experience means battle-tested accessibility patterns and deep UI library knowledge.

## Trade-offs

### Newer Library

Base UI reached v1.0 in late 2025, so it has less production mileage than Radix. However:

- The team has decades of combined UI library experience
- APIs are intentionally similar to Radix, easing migration
- MUI's track record provides confidence in long-term support

## Alternatives Considered

- **Radix UI**: Was the gold standard, but maintenance has stalled. Open bugs from years ago remain unfixed. The team that made it great now works on Base UI.
- **React Aria (Adobe)**: Excellent accessibility but more verbose API. Less community adoption.
- **Headless UI (Tailwind)**: Good but smaller component set. Less comprehensive than Base UI.
- **Ark UI**: Newer option from Chakra team. Less mature than Base UI.
