# ActivityRow

Renders window activity data as a timeline with automatic aggregation based on pixel density.

## Concept

The timeline shows activity at the "right" level of detail - like Google Maps. When zoomed out, data is aggregated. When zoomed in, individual details are shown.

**Key insight:** Detail level is determined per-block based on pixel width, not globally based on zoom level. This means a sparse 2-hour VS Code session can show individual windows while a dense 10-minute app-switching period shows aggregated blocks - at the same zoom level.

## Block Types

### 1. WindowBlock

Contains 1+ windows from the **same app**.

- Has position styling for visual chaining (solo/start/center/end)
- Consecutive WindowBlocks from the same app connect with dashed dividers
- Tooltip shows window title (if 1 window) or "N windows" (if multiple)

### 2. AppBlock

Contains 1+ **apps** (used when different apps merge).

- `apps[0]` is the **dominant app** (most total time), determines block color
- `apps.length > 1` → dominant app color + diagonal stripe overlay
- Tooltip shows ALL apps involved (no data hidden)

## Design Philosophy

### No Data Hiding

We never discard activity data. Even a 1-second app switch is preserved:

- **Visually**: Merged into larger block, stripe indicates "multiple apps"
- **Tooltip**: Shows full list of apps and activity counts
- **Data**: All activities remain in `block.activities` array

A 90% Brave + 10% Cursor block shows:

- Brave's color (dominant)
- Stripe overlay (indicates multiple apps)
- Tooltip: "Brave, Cursor - 2 apps · N activities"

### Absorption Behavior

Small items get **absorbed** into large neighbors, not vice versa:

```
[1s Chrome][30min VSCode] → [AppBlock: Chrome+VSCode]
                            ↑ Chrome absorbed into VSCode
                            ↑ Cannot see Chrome standalone even when zooming
```

This is intentional:

1. **1-second activities are noise** - Brief app switches don't represent meaningful work
2. **Visual clarity** - Tiny blocks would be unclickable and create clutter
3. **Data preserved** - Tooltip reveals the truth, nothing lost

## Algorithm

### Overview

Three-level processing with separate configurable thresholds:

- **Window-level threshold** (default 8px) - for merging windows within same app
- **App-level threshold** (default 12px) - for merging across different apps

Steps:

1. **Window-level merge** - within same-app segments (uses window threshold)
2. **App-level merge** - across different apps (uses app threshold)
3. **AppBlock consolidation** - merge consecutive same-dominant-app blocks

### Step-by-Step

```
1. Filter activities to visible bounds, sort by startTime

2. Group consecutive same-app activities into segments

3. Window-level merge (within each same-app segment):
   Uses minWindowBlockPx threshold (default 8px)
   Go left-to-right:
   - Small window (< threshold): accumulate in pending group
   - Large window (>= threshold):
     - If pending small windows exist → absorb them, flush combined
     - If no pending → keep as standalone
   - End of segment: merge remaining small into previous item

4. App-level merge (across all segments):
   Uses minAppBlockPx threshold (default 12px)
   Go left-to-right:
   - Small item (< threshold): accumulate in pending group
   - Large item (>= threshold):
     - If pending small items exist → absorb them, flush combined
     - If no pending → create WindowBlock
   - End: merge remaining small into previous block

   Combined items with different apps → AppBlock
   Combined items with same app → WindowBlock

5. Consolidate consecutive AppBlocks with same dominant app

6. Assign positions to consecutive same-app WindowBlocks (start/center/end)

7. Clip first/last block to timeline bounds
```

### Why Absorb Small Into Large?

Alternative: Only merge trailing small items (small stays separate until zoomed).
Problem: Creates unusable tiny blocks that can't be clicked or read.

Current approach: Small absorbed into next large neighbor.
Benefit: Every block is usable, data accessible via tooltip.

### Dominant App Determination

Apps in a merged block are sorted by **total duration**, not count:

```
[Cursor 45s + Chrome 10s + Slack 5s] → apps[0] = Cursor (45s > 10s > 5s)
```

This ensures the block's color represents the primary activity.

## Visual Examples

```
Zoomed in (all windows >= minWindowBlockPx):
[VS Code: file1 | file2 | file3][Chrome: tab1 | tab2][Slack]
   start    center   end         start     end       solo
         ↑ dashed dividers

Partially zoomed (some windows merged):
[VS Code: file1 | merged(3)][Chrome: merged(2)][Slack]
   start      end                 solo          solo

Very zoomed out (apps merged, items < minAppBlockPx):
[=========== AppBlock (VS Code + Chrome + Slack) ===========]
              ↑ Striped overlay, VS Code color (dominant)
```

## Interactions

### Click to Zoom

Clicking any block zooms to make that block fill ~70% of the visible area and centers it. This allows users to quickly drill down into merged blocks to see more detail while still showing neighboring blocks for context. The zoom is clamped to min/max bounds.

### Scroll to Pan

When zoomed in (zoom > 1), vertical scroll is converted to horizontal panning for easier navigation.

### Ctrl/Cmd + Scroll to Zoom

Hold Ctrl (or Cmd on Mac) while scrolling to zoom in/out centered on the mouse position.

## Data Flow

```
WindowActivityDto[]
        │
        ▼
ActivityRowCx.createBlocks()
        │
        ├─► 1. Filter to visible, sort by time
        ├─► 2. Group by consecutive same-app
        ├─► 3. Window-level merge within segments
        ├─► 4. App-level merge across segments
        ├─► 5. Consolidate consecutive same-dominant AppBlocks
        ├─► 6. Assign positions to WindowBlock sequences
        └─► 7. Clip to timeline bounds
        │
        ▼
$blocks (TActivityBlock[])
        │
        ▼
ActivityRow renders WindowBlock/AppBlock components
```