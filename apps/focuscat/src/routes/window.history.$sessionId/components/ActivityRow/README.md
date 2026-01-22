# ActivityTimeline

Renders window activity data as a timeline with automatic aggregation based on pixel density.

## Concept

The timeline shows activity at the "right" level of detail - like Google Maps. When zoomed out, data is aggregated. When zoomed in, individual details are shown.

**Key insight:** Detail level is determined per-block based on pixel width, not globally based on zoom level. This means a sparse 2-hour VS Code session can show individual windows while a dense 10-minute app-switching period shows aggregated blocks - at the same zoom level.

## Block Types

### 1. WindowBlock
Contains 1 or more windows from the **same app**.
- Has position styling for visual chaining (solo/start/center/end)
- Consecutive WindowBlocks from the same app connect with dashed dividers
- Tooltip shows window title (if 1 window) or "N windows" (if multiple)

### 2. AppBlock
Contains 1 or more **apps** (used when different apps merge, or when only app-level tracking).
- `apps[0]` is the **dominant app** (most total time), determines block color
- `apps.length === 1` → solid color, no visual distinction
- `apps.length > 1` → dominant app color + diagonal stripe overlay
- Tooltip shows app(s) involved

## When to Use Each

- **WindowBlock**: Same app, we have window-level detail
- **AppBlock**: Different apps merged together, OR only app-level tracking (no window info)

## Algorithm

### Overview

Two-level merging with configurable minimum block width (default 8px):
1. **Window level** - within same-app segments, merge small windows
2. **App level** - across segments, merge small items

### Step-by-Step

```
1. Filter activities to visible bounds, sort by startTime

2. Group consecutive same-app activities into segments

3. For each same-app segment, apply window-level merging:
   Go left-to-right through windows:
     if window >= minBlockPx AND no pending small windows → keep as individual
     if window >= minBlockPx AND pending small windows → combine all together
     if window < minBlockPx → accumulate until combined width >= minBlockPx

   Each resulting item becomes a WindowLevelItem (1+ windows, same app)

4. Apply app-level merging across all items:
   Go left-to-right:
     if item >= minBlockPx AND no pending small items → create WindowBlock
     if item >= minBlockPx AND pending small items → combine into single block
     if item < minBlockPx → accumulate until combined width >= minBlockPx

   If combined items have different apps → AppBlock
   If combined items have same app → WindowBlock

5. Merge consecutive AppBlocks with same dominant app into one

6. Assign positions to consecutive same-app WindowBlocks

7. Clip first/last block to timeline bounds
```

### Key Behavior: Combine with Large Neighbor

Small items are always combined with their next large neighbor to prevent undersized blocks:

```
Before fix (wrong):
[Chrome 4px][VSCode 20px]  ← Chrome block is undersized!

After fix (correct):
[AppBlock: Chrome+VSCode 24px]  ← Small Chrome combined with large VSCode
```

### Key Behavior: Merge Consecutive AppBlocks with Same Dominant App

Consecutive AppBlocks where the dominant app (apps[0]) is the same are merged:

```
Before:
[AppBlock: Cursor+Chrome][AppBlock: Cursor+Slack][AppBlock: Cursor+VSCode]
         ↑ striped              ↑ striped              ↑ striped

After:
[AppBlock: Cursor+Chrome+Slack+VSCode]
         ↑ single striped block with Cursor as dominant
```

### Edge Cases

Blocks may still be smaller than minBlockPx in these cases:
- **Timeline bounds**: First/last block clipped to visible area
- **Only small items**: If ALL items are small with no large neighbor to combine with
- **Render minimum**: Components enforce `Math.max(width, 2)` for visibility

### Position Chaining

All WindowBlocks from the same app participate in position chaining:

```
[Brave: window A (start) | Brave: windows B+C (center) | Brave: window D (end)]
                        ↑                            ↑
                  dashed dividers connect same-app blocks
```

Positions:
- `solo` - only block from this app, fully rounded
- `start` - first in sequence, left rounded, right dashed
- `center` - middle, no rounding, right dashed
- `end` - last in sequence, right rounded, no dashed

## Visual Examples

```
Zoomed in (all windows >= 8px):
[VS Code: file1|file2|file3][Chrome: tab1|tab2][Slack]
   start   center   end      start    end      solo

Partially zoomed (some merged):
[VS Code: file1|merged(2)|file4][Chrome: merged(3)][Slack]
   start    center     end           solo          solo

Very zoomed out (apps merged):
[========= AppBlock (VS Code + Chrome + Slack) =========]
            Striped overlay indicates multiple apps
```

## Data Flow

```
WindowActivityDto[]
        │
        ▼
ActivityRowCx.update()
        │
        ├─► Filter to visible activities
        ├─► Sort by start time
        ├─► Group by same-app segments
        ├─► Window-level merge within each segment → WindowBlocks
        ├─► App-level merge across segments → may create AppBlocks
        └─► Assign positions to same-app WindowBlock sequences
        │
        ▼
$blocks (TActivityBlock[])
        │
        ▼
ActivityRow renders each block via WindowBlock/AppBlock components
```

## Types

```typescript
type TActivityBlock = TWindowBlock | TAppBlock;

interface TWindowBlock {
  type: 'window';
  startMs: number;
  endMs: number;
  app: {
    bundleId: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
  windows: WindowActivityDto[];  // 1+, all same app
  position: 'solo' | 'start' | 'center' | 'end';
}

interface TAppBlock {
  type: 'app';
  startMs: number;
  endMs: number;
  apps: Array<{
    bundleId: string;
    name: string;
    icon: string | null;
    color: string | null;
  }>;  // 1+ apps
  activities: WindowActivityDto[];
}
```

## Configuration

```typescript
// Via ActivityRowCx options
const cx = new ActivityRowCx(timelineCx, activities, {
  minBlockPx: 16  // Minimum block width before merging (default: 8)
});
```

## File Structure

```
ActivityTimeline/
├── README.md              # This file
├── index.ts               # Public exports
├── types.ts               # TActivityBlock union type
├── ActivityRowCx.ts       # State management + block creation algorithm
├── ActivityRow.tsx        # Slim coordinator component
├── components/
│   ├── index.ts
│   ├── WindowBlock.tsx    # Window block view + tooltip
│   └── AppBlock.tsx       # App block view + tooltip
└── hooks/
    ├── index.ts
    └── use-block-position.ts
```

## Rendering Details

### WindowBlock
```tsx
<div
  className={cn(
    "absolute top-1 bottom-1",
    position === 'solo' && "rounded",
    position === 'start' && "rounded-l",
    position === 'end' && "rounded-r",
  )}
  style={{ backgroundColor: app.color, left, width }}
>
  {(position === 'start' || position === 'center') && (
    <div className="absolute right-0 inset-y-0 border-r border-dashed border-white/30" />
  )}
</div>
```

### AppBlock
```tsx
<div
  className="absolute top-1 bottom-1 rounded overflow-hidden"
  style={{ backgroundColor: dominantApp.color, left, width }}
>
  {apps.length > 1 && (
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 8px)'
      }}
    />
  )}
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

### With Custom Options

```tsx
// In ActivityRow.tsx, customize via ActivityRowCx constructor:
const cx = useMemoCleanup(() => {
  const instance = new ActivityRowCx(timelineCx, activities, {
    minBlockPx: 16  // Larger minimum = more aggressive merging
  });
  return [instance, () => instance.unmount()];
}, [timelineCx, activities]);
```

## Relationship to Timeline

- `Timeline` is a generic component providing zoom, pan, and coordinate conversion
- `TimelineCx` is generic - only time/pixel conversion, zoom, scroll
- `ActivityRowCx` owns activity-specific logic - block creation, resolution tracking
- `ActivityRow` is a slim coordinator that uses ActivityRowCx
- All aggregation logic lives in ActivityRowCx, keeping Timeline generic

## Design Decisions

1. **Two block types** - WindowBlock (same app, window detail) and AppBlock (mixed apps or app-only tracking). Simple and covers all cases.

2. **Two-level merging** - Apply same logic at window level (within app) and app level (across apps). Preserves maximum detail.

3. **Position chaining for ALL same-app WindowBlocks** - Whether a WindowBlock has 1 window or 5, it participates in the visual chain with dashed dividers.

4. **Stripes only when apps.length > 1** - No redundant flags, just check array length.
