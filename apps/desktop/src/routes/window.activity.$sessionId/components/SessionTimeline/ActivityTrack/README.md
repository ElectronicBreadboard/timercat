# ActivityTrack

Timeline track for session activity with automatic aggregation.

## Concept

Shows activity at the "right" level of detail — like Google Maps. Zoomed out shows aggregated data, zoomed in shows more structure.

`ActivityTrack` supports two views:

1. **Apps** — groups by app identity
2. **Focus** — groups by focus category

Both views use the same aggregation shape. The grouping key changes, but the pipeline stays the same:

1. **Within-key merge** — Tiny same-key runs combine so they stay visible
2. **Grouping** — Consecutive same-key runs become larger grouped blocks
3. **Cross-key merge** — Tiny groups merge with the smaller neighbor into mixed blocks
4. **Dominant merge** — Adjacent mixed blocks with the same dominant key collapse together

A sparse 2-hour coding session shows clearer same-app or same-category structure, while a dense 10-minute switching period shows aggregated blocks. The "smallest neighbor" preference minimizes disruption to large blocks.

## What You See

### Apps View

When consecutive activities are from the same app, they're grouped visually:

```text
[VS Code: file1 | file2 | file3]
         ↑ dashed dividers between windows
```

- Rounded container with app's color
- Dashed dividers separate individual window segments
- Dark colors get a subtle white border for visibility

When different apps are merged because the timeline is too compact:

```text
[====== Merged Block ======]
        ↑ diagonal stripes
```

- Dominant app's color (most total time)
- Diagonal stripe overlay indicates multiple apps
- Tooltip shows the top apps in the block

### Focus View

When consecutive activities stay in the same focus category, they render as one solid block:

```text
[ Distracting ]
```

- Uses the category color
- No internal dashed dividers
- Tooltip focuses on concrete usage inside the block

When nearby focus categories are merged because the timeline is too compact:

```text
[====== Merged Block ======]
        ↑ diagonal stripes
```

- Dominant category's color
- Same diagonal stripe overlay as mixed app blocks
- Tooltip stays category-first and shows category distribution

## Aggregation Philosophy

### No Data Hiding

Activity data is never discarded. Even 1-second switches are preserved:

- **Visually:** Merged into larger blocks, stripes indicate "mixed content"
- **Tooltip:** Shows a summary of what contributed to the block
- **Data:** All underlying activities remain attached to merged blocks

### Tiny Blocks Get Merged

Blocks too small to display meaningfully get merged with neighbors:

```text
[1s Chrome][30min VSCode] → [30min: Chrome merged into VSCode block]
[3s Distracting][2s Neutral][1s Focused][...] → [Merged: shows dominant category with stripes]
```

This ensures blocks stay large enough to see and interact with, while preserving the data in tooltips.

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
