# Frontend Feature Structure

How to organize a feature module in our frontend apps.

## File Structure

```
feature-name/
├── index.ts           # Barrel exports (always)
├── [Feature]Cx.tsx    # State container + React context (if stateful)
├── types.ts           # Shared types (if needed)
├── components/        # Feature-specific UI (if multiple components)
│   └── index.ts
├── hooks/             # Feature-specific hooks (if any)
│   └── index.ts
└── lib/               # Feature-specific utilities (if any)
    └── index.ts
```

## When to Create Each File

| File / Dir    | Create when...                                    |
| ------------- | ------------------------------------------------- |
| `index.ts`    | Always                                            |
| `*Cx.tsx`     | Feature has state, events, or backend interaction |
| `types.ts`    | Feature has shared types                          |
| `components/` | Feature has 2+ components                         |
| `hooks/`      | Feature has custom hooks                          |
| `lib/`        | Feature has utility functions                     |

For small features, skip subdirectories. A feature can be just `index.ts` + one component or context file.

## File Contents

### index.ts

Start with a one-line comment describing what this feature does. Then barrel export everything public.

```typescript
// Manages shopping cart: add/remove items, compute totals, apply discounts.
export * from './components';
export * from './CartCx';
export * from './types';
```

### \*Cx.tsx (Context / State Container)

The `Cx` suffix stands for "context." This is the feature's **state and logic container** — the frontend equivalent of a service or store, provided via React context.

**Why Cx exists:** Business logic should live in the backend when possible. But the frontend still needs state management, event listeners, and methods to call the backend. Instead of scattering this across hooks and prop drilling `setState`, the Cx class centralizes it in one place. Routes and components consume it via context — no prop drilling needed.

**Pattern:**

```typescript
// 1. Class-based state container
export class CartCx {
  // Reactive state ($ prefix = observable)
  public readonly $items = createState<Item[]>([]);
  public readonly $total = createState(0);

  constructor() {
    this.init();
  }

  // Async initialization (fetch data, listen to events)
  private async init(): Promise<void> { ... }

  // Cleanup (unlisten events, cancel timers)
  public unmount(): void { ... }

  // Public methods (the feature's API)
  public async addItem(item: Item): Promise<void> { ... }
  public async removeItem(id: string): Promise<void> { ... }
}

// 2. React context wiring
const ReactCartCx = React.createContext<CartCx | null>(null);

export const CartCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cx = useMemoCleanup(() => {
    const cartCx = new CartCx();
    return [cartCx, () => cartCx.unmount()];
  }, []);
  return <ReactCartCx.Provider value={cx}>{children}</ReactCartCx.Provider>;
};

// 3. Hook for consuming
export function useCartCx(): CartCx {
  const cx = React.useContext(ReactCartCx);
  if (cx == null) throw new Error('useCartCx must be used within CartCxProvider');
  return cx;
}
```

**How routes/components consume it:**

```typescript
function CartPage() {
  const cartCx = useCartCx();
  const items = useFeatureState(cartCx.$items);  // Subscribe to reactive state

  return items.map(item => <CartItem key={item.id} item={item} />);
}
```

**Conventions:**

- Reactive state properties use `$` prefix (`$items`, `$total`)
- `init()` for async setup, `unmount()` for cleanup
- One `Cx` per feature (if the feature needs state)
- Consumers read state via `useFeatureState(cx.$property)` in components
- Public methods are the feature's API — call backend commands, update state, emit events

### components/

Feature-specific UI components. Each component gets its own file. Barrel export via `index.ts`.

```
components/
├── CartItem.tsx
├── CartSummary.tsx
├── DiscountBadge.tsx
└── index.ts
```

If a feature only has one component, put it at the feature root instead of creating a `components/` directory.

### hooks/

Feature-specific hooks. Use the `use-` prefix for filenames.

```
hooks/
├── use-cart-validation.ts
├── use-discount-code.ts
└── index.ts
```

### types.ts

Shared types used across multiple files in the feature. Types only used in one file should stay in that file.

## Examples

### Small feature (just state)

```
theme/
├── ThemeCx.tsx       # Theme state, toggle dark/light
└── index.ts
```

### Medium feature (state + components)

```
notification/
├── NotificationCx.tsx
├── components/
│   ├── NotificationList.tsx
│   ├── NotificationItem.tsx
│   └── index.ts
└── index.ts
```

### Medium feature (no state, just UI + hooks)

```
permission/
├── PermissionBadge.tsx
├── hooks/
│   ├── use-camera-permission.ts
│   ├── use-location-permission.ts
│   └── index.ts
└── index.ts
```

### Large feature (everything)

```
editor/
├── components/
│   ├── display/
│   ├── input/
│   └── panel/
├── hooks/
├── lib/
├── environment/
├── nodes/            # Domain-specific subdirectory
├── types.ts
└── index.ts
```

Large features may develop domain-specific subdirectories (like `nodes/`, `mixins/`) beyond the standard ones. This is fine — the structure scales by nesting the same patterns deeper.
