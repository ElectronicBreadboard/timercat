# ActivityRow

Timeline visualization for window activity data with automatic aggregation.

## Concept

Shows activity at the "right" level of detail — like Google Maps. Zoomed out shows aggregated data, zoomed in shows individual windows.

**Key insight:** Detail level is per-block based on pixel width, not global zoom. A sparse 2-hour coding session can show individual windows while a dense 10-minute app-switching period shows aggregated blocks — at the same zoom level.

## What You See

### Single-App Blocks

When consecutive activities are from the same app, they're grouped visually:

```
[VS Code: file1 | file2 | file3]
         ↑ dashed dividers between windows
```

- Rounded container with app's color
- Dashed dividers separate individual windows
- Dark colors get a subtle white border for visibility

### Multi-App Blocks

When different apps are merged (too small to show individually):

```
[====== Merged Block ======]
        ↑ diagonal stripes
```

- Dominant app's color (most total time)
- Diagonal stripe overlay indicates multiple apps
- Tooltip reveals all apps involved

## Aggregation Philosophy

### No Data Hiding

Activity data is never discarded. Even 1-second app switches are preserved:

- **Visually:** Merged into larger block, stripes indicate "multiple apps"
- **Tooltip:** Shows full list of apps and activity counts
- **Data:** All activities remain accessible

### Small Gets Absorbed

Small items merge into large neighbors, not vice versa:

```
[1s Chrome][30min VSCode] → [Merged: Chrome absorbed into VSCode]
```

This is intentional:

1. Brief app switches are noise, not meaningful work
2. Tiny blocks would be unclickable
3. Data is preserved in tooltips

## Interactions

| Action               | Effect                    |
| -------------------- | ------------------------- |
| Click block          | Zoom to fill ~70% of view |
| Scroll (when zoomed) | Pan horizontally          |
| Ctrl/Cmd + Scroll    | Zoom at mouse position    |

## Session Events

Timeline also shows session events as overlays and markers:

| Event     | Visual        | Meaning                   |
| --------- | ------------- | ------------------------- |
| Pause     | Amber overlay | Timer was paused          |
| Overtime  | Red overlay   | Timer hit 0 but continued |
| Cancelled | Gray overlay  | Session ended early       |

Markers appear as pins at the top with dashed vertical lines.
