import { useMemoCleanup } from '@repo/ui';
import { withLocalStorage } from 'feature-react';
import { createState } from 'feature-state';
import React from 'react';

export class WindowCx {
	public readonly $focusedId = createState<TWindowId | null>(null);

	public readonly containerRef = React.createRef<HTMLDivElement>();
	public readonly $containerRect = createState<TContainerRect>({ width: 0, height: 0 });

	public readonly windows = {
		main: withLocalStorage(
			createState<TWindow>({
				id: 'main',
				trafficLights: { close: false, minimize: false, maximize: false },
				bounds: { size: { width: 300, height: 500 }, position: null },
				isOpen: true,
				zIndex: 10,
				boundsBeforeMaximize: null
			}),
			'focuscat-window-main'
		),
		settings: withLocalStorage(
			createState<TWindow>({
				id: 'settings',
				trafficLights: { close: true, minimize: true, maximize: true },
				bounds: { size: { width: 600, height: 450 }, position: null },
				isOpen: false,
				zIndex: 11,
				boundsBeforeMaximize: null
			}),
			'focuscat-window-settings'
		)
	} as const;

	constructor() {
		for (const window of Object.values(this.windows)) {
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

		// Close main window when settings is opened
		if (id === 'settings') {
			this.windows.main.set((prev) => ({ ...prev, isOpen: false }));
		}
	}

	public close(id: TWindowId): void {
		this.windows[id].set((prev) => ({ ...prev, isOpen: false }));

		// Open main window when settings is closed
		if (id === 'settings') {
			const maxZ = this._maxZ();
			this.windows.main.set((prev) => ({ ...prev, isOpen: true, zIndex: maxZ + 1 }));
		}
	}

	public minimize(id: TWindowId): void {
		this.close(id);
	}

	public maximize(id: TWindowId): void {
		const prev = this.windows[id].get();
		const bounds = prev.boundsBeforeMaximize;
		if (bounds != null) {
			this.windows[id].set((p) => ({
				...p,
				boundsBeforeMaximize: null,
				bounds
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

	private _maxZ(): number {
		return Math.max(...Object.values(this.windows).map((window) => window.get().zIndex));
	}
}

export interface TContainerRect {
	width: number;
	height: number;
}

export interface TWindow {
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

export type TWindowId = 'main' | 'settings';

export type TBounds = {
	size: { width: number; height: number };
	position: { x: number; y: number } | null; // null = auto-centered on first render
};

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

	return <ReactWindowCx.Provider value={cx}>{children}</ReactWindowCx.Provider>;
};

export function useWindowCx(): WindowCx {
	const cx = React.useContext(ReactWindowCx);
	if (cx == null) {
		throw new Error('useWindowCx must be used within a WindowCxProvider');
	}
	return cx;
}
