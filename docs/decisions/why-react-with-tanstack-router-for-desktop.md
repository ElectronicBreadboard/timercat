# Why React with TanStack Router for Desktop

## Decision

We chose **React** as the frontend framework and **TanStack Router** as the routing solution for our Tauri desktop application.

## Rationale

### Why React

- Most popular frontend framework with extensive ecosystem
- Team familiarity reduces onboarding time and maintenance burden

### Why TanStack Router

#### Type Support

Superior TypeScript integration compared to React Router, providing full type safety for routes, params, and loaders out of the box.

#### Route Definition Clarity

Route definitions are co-located at the top of each file, making route configuration immediately visible:

```tsx
export const Route = createFileRoute('/')({
	component: Home,
	loader: async () => {
		return {
			message: 'Hello World'
		};
	},
	errorComponent: ({ error }) => <div>{error.message}</div>
});
```

Compare this to React Router's approach where you need to export components, loaders, and configs separately:

```tsx
// React Router example - separate exports
export async function loader() {
	return {
		message: 'Hello World'
	};
}

export function Component() {
	const { message } = useLoaderData();
	return <div>{message}</div>;
}

export function ErrorBoundary({ error }) {
	return <div>{error.message}</div>;
}
```

TanStack Router's approach is more discoverable - everything about a route is visible at the top of the file. You can register all route concerns (component, loader, errorComponent, etc.) at the top, then shift-click in VS Code to jump directly to the implementation.

#### Developer Tools

Built-in dev tools (`TanStackRouterDevtools`) provide excellent debugging capabilities during development.

#### Migration Path

We decided to try TanStack Router for this project. Since the mental model with loaders and components is quite similar to React Router, migration would be straightforward if we're not happy with TanStack Router.

### Things We Don't Like

#### Server Bundle

TanStack Start creates a server bundle even in SPA mode. We need to investigate how to exclude this for pure SPA deployments. See [RFC #3394](https://github.com/TanStack/router/discussions/3394) for ongoing SPA mode enhancements.

#### Error Handling

`instanceof XyzError` checks don't work in `errorComponent`. Workaround: use TypeScript type guards like `error is XyzError` instead.

#### No `React.FC`

Can't use `React.FC` for route components because it would require a `const` declaration, and `const` declarations must be defined above the Route definition (unlike function declarations which are hoisted). This means we use function declarations instead of arrow functions for components.

