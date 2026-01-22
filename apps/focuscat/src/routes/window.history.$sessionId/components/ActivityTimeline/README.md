# ActivityTimeline

Renders window activity data as a timeline with automatic aggregation based on pixel density.

## Concept

The timeline shows activity at the "right" level of detail - like Google Maps. When zoomed out, data is aggregated. When zoomed in, individual details are shown.

**Key insight:** Detail level is determined per-block based on pixel width, not globally based on zoom level. This means a sparse 2-hour VS Code session can show individual windows while a dense 10-minute app-switching period shows aggregated blocks - at the same zoom level.

## Block Types

### 1. Window
Individual window activity shown when there's enough space (>= 8px wide).

**Visual composition within same app:**
- `solo` - single window, fully rounded corners
- `start` - left rounded, right has dashed line (no rounding)
- `center` - no rounded corners, right has dashed line
- `end` - right rounded, no dashed lines

This creates a continuous visual appearance for same-app window sequences.

### 2. WindowMerged
Multiple windows from the **same app** merged together because some were too small individually.
- Solid colored block with rounded corners
- Tooltip shows window count
- Same visual style as Window but represents multiple windows

### 3. AppMerged
Multiple **different apps** merged together because individual apps would be too small.
- Colored by dominant app (longest duration)
- Diagonal stripe overlay (white at 20% opacity) to indicate mixed content
- Tooltip shows all apps involved

## Algorithm

### Overview

The algorithm applies the same merge logic at two levels:
1. **Window level** - within same-app segments, merge small windows
2. **App level** - across apps, merge small app segments

This ensures we never lose detail unnecessarily - if only one window is small, we merge just that one with its neighbor, not the entire app.

### Step-by-Step

```
1. Filter activities to visible bounds, sort by startTime

2. Group consecutive same-app activities into segments

3. For each same-app segment, apply window-level merging:
   Go left-to-right through windows:
     if window >= 8px → keep as individual
     if window < 8px → merge with neighbors until >= 8px

   Result: list of (single window) or (merged windows) within this app

4. Flatten all segments into a single list of "app-level items"
   Each item is either:
   - A single Window block
   - A WindowMerged block (multiple windows, same app)

5. Apply app-level merging on this list:
   Go left-to-right:
     if item >= 8px → keep as is
     if item < 8px → merge with neighbors until >= 8px

   If merged items have different apps → AppMerged block

6. Assign window positions (start/center/end/solo) for Window blocks
```

### Merge Logic Details

When merging small items:
1. Start accumulating small items into a "merge group"
2. Keep adding until total width >= 8px
3. If a large item (>= 8px) is encountered:
   - First finalize the pending merge group (even if < 8px, absorb into adjacent)
   - Then add the large item as its own block
4. At the end, any remaining merge group gets finalized

**Same-app merge** → WindowMerged block
**Different-app merge** → AppMerged block

### Example

```
Input at current zoom:
[VS Code: file1 (20px)] [VS Code: file2 (3px)] [VS Code: file3 (4px)] [VS Code: file4 (25px)] [Chrome: tab1 (5px)] [Chrome: tab2 (30px)]

Step 3 - Window-level merge within each app:
  VS Code: [file1: 20px] [file2+file3: 7px] [file4: 25px]
           Note: file2+file3 is only 7px, will be handled at app level
  Chrome: [tab1: 5px] [tab2: 30px]
          Note: tab1 is only 5px, will be handled at app level

Step 5 - App-level merge:
  [file1: 20px] [file2+file3: 7px] [file4: 25px] [tab1: 5px] [tab2: 30px]

  file1 >= 8px → Window block
  file2+file3 < 8px → start merge group
  file4 >= 8px → finalize merge group (absorb file2+file3 into file1 or file4)
  ...

Final result (one possibility):
  [Window: file1] [WindowMerged: file2+file3+file4] [WindowMerged: tab1+tab2]

  Or if we merge backward:
  [WindowMerged: file1+file2+file3] [Window: file4] [WindowMerged: tab1+tab2]
```

## Visual Examples

```
Zoomed in (all items >= 8px):
[VS Code: file1.ts|file2.ts|file3.ts][Chrome: tab1|tab2][Slack]
     └─ start ─┘└─ center ─┘└─ end ─┘

Partially zoomed (some windows merged):
[VS Code: file1|merged(2)|file4][Chrome: merged(3)][Slack]
         Window  WindowMerged     WindowMerged     Window

Very zoomed out (apps merged):
[========= AppMerged (VS Code + Chrome + Slack) =========]
            Striped overlay indicates mixed apps
```

## Data Flow

```
WindowActivityDto[]
        │
        ▼
createBlocks(activities, { bounds, msToPx })
        │
        ├─► Filter to visible activities
        ├─► Sort by start time
        ├─► Group by same-app segments
        ├─► Window-level merge within each segment
        ├─► App-level merge across segments
        └─► Assign window positions
        │
        ▼
TActivityBlock[] (Window | WindowMerged | AppMerged)
        │
        ▼
ActivityRow renders each block with type-specific styling
```

## Types

```typescript
type TActivityBlock = TWindowBlock | TWindowMergedBlock | TAppMergedBlock;

interface TWindowBlock {
  type: 'window';
  startMs: number;
  endMs: number;
  activity: WindowActivityDto;
  position: 'solo' | 'start' | 'center' | 'end';
}

interface TWindowMergedBlock {
  type: 'window-merged';
  startMs: number;
  endMs: number;
  bundleId: string;
  appName: string;
  appIcon: string | null;
  appColor: string | null;
  windows: WindowActivityDto[];
}

interface TAppMergedBlock {
  type: 'app-merged';
  startMs: number;
  endMs: number;
  dominantApp: {
    bundleId: string;
    appName: string;
    appIcon: string | null;
    appColor: string | null;
  };
  activities: WindowActivityDto[];
  uniqueApps: Array<{ bundleId: string; appName: string; appIcon: string | null }>;
}
```

## Configuration

```typescript
const MIN_BLOCK_PX = 8;  // Minimum block width before merging
```

## File Structure

```
ActivityTimeline/
├── README.md           # This file
├── index.ts            # Public exports
├── types.ts            # TActivityBlock union type
├── create-blocks.ts    # Block creation algorithm
└── ActivityRow.tsx     # Row component + block renderers
```

## Rendering Details

### Window Block
```tsx
<div
  className={cn(
    "absolute top-1 bottom-1",
    position === 'solo' && "rounded",
    position === 'start' && "rounded-l",
    position === 'end' && "rounded-r",
  )}
  style={{ backgroundColor: appColor, left, width }}
>
  {(position === 'start' || position === 'center') && (
    <div className="absolute right-0 inset-y-0 border-r border-dashed border-white/30" />
  )}
</div>
```

### WindowMerged Block
```tsx
<div
  className="absolute top-1 bottom-1 rounded"
  style={{ backgroundColor: appColor, left, width }}
/>
```

### AppMerged Block
```tsx
<div
  className="absolute top-1 bottom-1 rounded overflow-hidden"
  style={{ backgroundColor: dominantAppColor, left, width }}
>
  <div
    className="absolute inset-0 opacity-20"
    style={{
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
    }}
  />
</div>
```

## Usage

```tsx
import { ActivityRow } from './ActivityTimeline';

<Timeline startMs={sessionStart} endMs={sessionEnd}>
  <TimelineAxis />
  <ActivityRow activities={activities} />
</Timeline>
```

## Relationship to Timeline

- `Timeline` is a generic component providing zoom, pan, and coordinate conversion
- `ActivityTimeline` is activity-specific, handling aggregation and rendering
- `TimelineCx` provides `msToPx()` which ActivityTimeline uses for width calculations
- All aggregation logic lives here, keeping Timeline generic

## Design Decisions

1. **Two-level merging** - Apply same logic at window level (within app) and app level (across apps). This preserves maximum detail.

2. **Merge small with neighbors** - When an item is too small, merge with adjacent items until >= 8px. If still small at end, absorb into nearest block.

3. **Visual distinction for AppMerged** - Diagonal stripes indicate mixed apps, so users know it's not a single app.

4. **Position styling for Window sequences** - Windows from same app visually connect with dashed dividers, appearing as one continuous block.
