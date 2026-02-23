import { mq, useMediaQuery, useMemoCleanup } from '@repo/ui';
import { createState, TPersistFeature, TState } from 'feature-state';
import React from 'react';
import { TVersionedMigrationConfig, withVersionedLocalStorage } from '@/lib';

export class WindowCx {
	private static readonly _windowConfig: Record<TWindowId, TWindowConfig> = {
		main: {
			canMaximize: true,
			version: '0.0.1',
			id: 'main',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: { size: { width: 300, height: 500 }, position: null },
			isOpen: true,
			zIndex: 10,
			boundsBeforeMaximize: null,
			onOpen(cx) {
				cx.windows.cat.set((prev) => ({ ...prev, isOpen: false }));
			}
		},
		settings: {
			canMaximize: true,
			version: '0.0.1',
			id: 'settings',
			trafficLights: { close: true, minimize: true, maximize: true },
			bounds: { size: { width: 600, height: 450 }, position: null },
			isOpen: false,
			zIndex: 11,
			boundsBeforeMaximize: null,
			onOpen(cx) {
				cx.windows.main.set((prev) => ({ ...prev, isOpen: false }));
			},
			onClose(cx) {
				cx.open('main');
			}
		},
		cat: {
			canMaximize: false,
			version: '0.0.1',
			id: 'cat',
			trafficLights: { close: false, minimize: false, maximize: false },
			bounds: { size: { width: 170, height: 170 }, position: null },
			isOpen: false,
			zIndex: 12,
			boundsBeforeMaximize: null,
			onOpen(cx) {
				cx.windows.main.set((prev) => ({ ...prev, isOpen: false }));
			}
		}
	};

	public readonly $focusedId = createState<TWindowId | null>(null);
	public readonly $breakpoint = createState<TBreakpoint>('lg');

	public readonly containerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<TContainerRect>({ width: 0, height: 0 });

	public readonly windows: Record<TWindowId, TState<TWindow, [TPersistFeature]>> = {} as Record<
		TWindowId,
		TState<TWindow, [TPersistFeature]>
	>;

	constructor() {
		for (const windowConfig of Object.values(WindowCx._windowConfig)) {
			const window = withVersionedLocalStorage(
				createState<TWindow>(this._toWindowState(windowConfig)),
				`focuscat-window-${windowConfig.id}`,
				windowMigrationConfig
			);
			this.windows[windowConfig.id] = window;
			window.listen(({ value: window, prevValue: prevWindow }) => {
				if (window.isOpen && prevWindow?.isOpen !== window.isOpen) {
					this.$focusedId.set(window.id);
				}
			});
		}
	}

	public mount(): void {
		for (const window of Object.values(this.windows)) {
			void window.persist();
		}
	}

	public unmount(): void {}

	public open(id: TWindowId): void {
		const maxZ = this._maxZ();
		this.windows[id].set((prev) => ({ ...prev, isOpen: true, zIndex: maxZ + 1 }));
		WindowCx._windowConfig[id].onOpen?.(this);

		// Auto-maximize on narrow (sm) if this window supports it
		if (
			WindowCx._windowConfig[id].canMaximize &&
			this.$breakpoint.get() === 'sm' &&
			this.windows[id].get().boundsBeforeMaximize == null
		) {
			this.maximize(id);
		}
	}

	public close(id: TWindowId): void {
		this.windows[id].set((prev) => ({ ...prev, isOpen: false }));
		WindowCx._windowConfig[id].onClose?.(this);
	}

	public minimize(id: TWindowId): void {
		this.close(id);
	}

	public maximize(id: TWindowId): void {
		const prev = this.windows[id].get();

		const bounds = prev.boundsBeforeMaximize;
		if (bounds != null) {
			const container = this.$containerRect.get();

			let position = bounds.position;
			if (position != null) {
				const outOfBounds =
					position.x < 0 ||
					position.y < 0 ||
					position.x + bounds.size.width > container.width ||
					position.y + bounds.size.height > container.height;

				// If the saved position is out of bounds, center instead of using it
				if (outOfBounds) {
					position = {
						x: Math.max(0, (container.width - bounds.size.width) / 2),
						y: Math.max(0, (container.height - bounds.size.height) / 2)
					};
				}
			}

			this.windows[id].set((p) => ({
				...p,
				boundsBeforeMaximize: null,
				bounds: { ...bounds, position }
			}));

			return;
		}

		const el = this.containerRef.current;
		const rect = el != null ? el.getBoundingClientRect() : this.$containerRect.get();
		this.windows[id].set((p) => ({
			...p,
			boundsBeforeMaximize: p.bounds,
			bounds: {
				size: { width: rect.width, height: rect.height },
				position: { x: 0, y: 0 }
			}
		}));
	}

	public bringToFront(id: TWindowId): void {
		const maxZ = this._maxZ();
		if (this.windows[id].get().zIndex < maxZ) {
			this.windows[id].set((prev) => ({ ...prev, zIndex: maxZ + 1 }));
		}
		this.$focusedId.set(id);
	}

	public clearFocus(): void {
		this.$focusedId.set(null);
	}

	public setPosition(id: TWindowId, x: number, y: number): void {
		this.windows[id].set((prev) => ({
			...prev,
			bounds: { ...prev.bounds, position: { x, y } }
		}));
	}

	public setContainerRect(width: number, height: number): void {
		this.$containerRect.set({ width, height });
		this._clampWindowPositions(width, height);
	}

	public setBreakpoint(breakpoint: TBreakpoint): void {
		const prev = this.$breakpoint.get();
		this.$breakpoint.set(breakpoint);

		if (prev !== 'sm' && breakpoint === 'sm') {
			// Entering narrow (sm): maximize open maximizable windows + enable maximize button for all
			for (const id of Object.keys(this.windows) as TWindowId[]) {
				if (!WindowCx._windowConfig[id].canMaximize) {
					continue;
				}
				const w = this.windows[id].get();
				this.windows[id].set((p) => ({
					...p,
					trafficLights: { ...p.trafficLights, maximize: true }
				}));
				if (w.isOpen && w.boundsBeforeMaximize == null) {
					this.maximize(id);
				}
			}
		} else if (prev === 'sm' && breakpoint !== 'sm') {
			// Leaving narrow (sm): restore all windows to default traffic lights + un-maximize
			for (const id of Object.keys(this.windows) as TWindowId[]) {
				const w = this.windows[id].get();
				this.windows[id].set((p) => ({
					...p,
					trafficLights: WindowCx._windowConfig[id].trafficLights
				}));
				if (w.boundsBeforeMaximize != null) {
					this.maximize(id); // toggles back since boundsBeforeMaximize is set
				}
			}
		}
	}

	private _clampWindowPositions(containerWidth: number, containerHeight: number): void {
		for (const win of Object.values(this.windows)) {
			const w = win.get();
			if (w.bounds.position == null) {
				continue;
			}

			const maxX = Math.max(0, containerWidth - w.bounds.size.width);
			const maxY = Math.max(0, containerHeight - w.bounds.size.height);
			const x = Math.max(0, Math.min(w.bounds.position.x, maxX));
			const y = Math.max(0, Math.min(w.bounds.position.y, maxY));
			if (x !== w.bounds.position.x || y !== w.bounds.position.y) {
				win.set((prev) => ({ ...prev, bounds: { ...prev.bounds, position: { x, y } } }));
			}
		}
	}

	private _maxZ(): number {
		return Math.max(...Object.values(this.windows).map((window) => window.get().zIndex));
	}

	private _toWindowState(config: TWindowConfig): TWindow {
		const { canMaximize, onOpen, onClose, ...rest } = config;
		return rest;
	}
}

const windowMigrationConfig: TVersionedMigrationConfig<TWindow> = {
	latestVersion: '0.0.1',
	migrations: {}
};

export interface TContainerRect {
	width: number;
	height: number;
}

export interface TWindow {
	version: '0.0.1';
	id: TWindowId;
	trafficLights: {
		close: boolean;
		minimize: boolean;
		maximize: boolean;
	};
	bounds: TBounds;
	isOpen: boolean;
	zIndex: number;
	boundsBeforeMaximize: TBounds | null;
}

export interface TWindowConfig extends TWindow {
	canMaximize: boolean;
	onOpen?: (cx: WindowCx) => void;
	onClose?: (cx: WindowCx) => void;
}

export type TWindowId = 'main' | 'settings' | 'cat';
export type TBreakpoint = 'sm' | 'md' | 'lg';

export interface TBounds {
	size: { width: number; height: number };
	/** null = auto-centered on first render */
	position: { x: number; y: number } | null;
}

// MARK: - React Context

const ReactWindowCx = React.createContext<WindowCx | null>(null);

export const WindowCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const windowCx = new WindowCx();
		return [windowCx, () => windowCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.mount();
	}, [cx]);

	const isMobileDown = useMediaQuery(mq.max(mq.sm)); // < 640px
	const isDesktopUp = useMediaQuery(mq.min(mq.lg)); // >= 1024px
	const breakpoint: TBreakpoint = isMobileDown ? 'sm' : isDesktopUp ? 'lg' : 'md';
	React.useEffect(() => {
		cx.setBreakpoint(breakpoint);
	}, [cx, breakpoint]);

	return <ReactWindowCx.Provider value={cx}>{children}</ReactWindowCx.Provider>;
};

export function useWindowCx(): WindowCx {
	const cx = React.useContext(ReactWindowCx);
	if (cx == null) {
		throw new Error('useWindowCx must be used within a WindowCxProvider');
	}
	return cx;
}
