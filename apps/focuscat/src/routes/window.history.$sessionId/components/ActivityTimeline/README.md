# ActivityTimeline

Renders window activity data as a timeline with automatic detail aggregation based on density.

## Concept

The timeline shows activity at the "right" level of detail - like Google Maps. When zoomed out, data is aggregated. When zoomed in, individual details are shown.

**Key insight:** Detail level is determined per-block based on density (items per pixel), not globally based on zoom level. This means a sparse 2-hour VS Code session can show individual windows while a dense 10-minute app-switching period shows aggregated blocks - at the same zoom level.

## Block Hierarchy

```
Level 3: Cluster Block
         Multiple apps grouped together
         Used when: rapid app switching creates too many app blocks
         Shows: dominant app (by duration)

Level 2: App Block
         Single app, multiple windows grouped
         Used when: too many windows to show individually
         Shows: app icon, name, total duration

Level 1: Window Block
         Individual window/tab activity
         Used when: enough space to show detail
         Shows: app icon, window title, duration
```

## Density-Based Aggregation

### How it works

1. Activities are grouped by consecutive same-app periods ("app segments")
2. For each segment, calculate density: `windowCount / pixelWidth`
3. If density exceeds threshold → render as App Block instead of Window Blocks
4. After app-level, check overall density of app blocks
5. If app density exceeds threshold → merge rapid-switching periods into Cluster Blocks

### Example

```
Timeline at 1-hour zoom:

[---- VS Code (2h, 5 windows) ----][Cluster: rapid switching][-- Chrome --]
         ↑                              ↑                        ↑
    Low density                   High density              Low density
    Shows windows              Shows as cluster            Shows windows
```

## Data Flow

```
WindowActivityDto[]
        │
        ▼
createBlocks(activities, msToPx, config)
        │
        ├─► Group consecutive same-app activities
        ├─► Calculate density per group
        ├─► Decide: Window Blocks vs App Block
        ├─► Check app-level density
        └─► Cluster if needed
        │
        ▼
TActivityBlock[] (mixed types based on density)
        │
        ▼
ActivityRow renders each block with appropriate component
```

## File Structure

```
ActivityTimeline/
├── README.md           # This file
├── index.ts            # Public exports
├── types.ts            # TActivityBlock union type
├── create-blocks.ts    # Block creation with density logic
└── ActivityRow.tsx     # Row component + block renderers
```

## Types

```typescript
type TActivityBlock = TWindowBlock | TAppBlock | TClusterBlock;

interface TWindowBlock {
  type: 'window';
  activity: WindowActivityDto;
  startMs: number;
  endMs: number;
  isAppStart: boolean;  // For rounded corners
  isAppEnd: boolean;
}

interface TAppBlock {
  type: 'app';
  bundleId: string;
  appName: string;
  appIcon: string | null;
  appColor: string | null;
  startMs: number;
  endMs: number;
  windowCount: number;
}

interface TClusterBlock {
  type: 'cluster';
  startMs: number;
  endMs: number;
  dominantApp: { bundleId: string; appName: string; appIcon: string | null; appColor: string | null };
  appCount: number;
  activityCount: number;
}
```

## Configuration

```typescript
interface TBlockConfig {
  // Max windows per pixel before aggregating to app level
  windowToAppThreshold: number;  // default: 0.1 (1 window per 10px)

  // Max apps per pixel before aggregating to cluster level
  appToClusterThreshold: number; // default: 0.05 (1 app per 20px)
}
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
- `TimelineCx` provides `msToPx()` which ActivityTimeline uses for density calculation
- All aggregation logic lives here, keeping Timeline generic
