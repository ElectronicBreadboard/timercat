import { ChevronsLeftRightIcon, ChevronsRightLeftIcon, cn, MinusIcon, XIcon } from '@repo/ui';
import { useCombinedCompute, useCompute, useListener } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import {
	isAbsolutePosition,
	isWindowVisible,
	type TAbsolutePosition,
	type TBounds,
	type TPosition,
	type TWindow,
	type TWindowId,
	type WindowCx
} from '@/features/window';

export const DraggableWindow: React.FC<TDraggableWindowProps> = (props) => {
	const {
		windowId,
		windowCx,
		transparent = false,
		dragThreshold,
		excludeFromDrag = 'button, a, input, select, textarea',
		onClose,
		onMinimize,
		onMaximize,
		children
	} = props;
	const $window = windowCx.windows[windowId];

	const isVisible = useCompute($window, ({ value }) => isWindowVisible(value));
	const trafficLights = useCompute($window, ({ value }) => value.trafficLights);
	const isMaximized = useCompute($window, ({ value }) => value.boundsBeforeMaximize != null);
	const canToggleMaximize = useCombinedCompute(
		[$window, windowCx.$containerRect],
		([winCx, containerCx]) => {
			const bounds = winCx.value.boundsBeforeMaximize;
			if (bounds == null) {
				return true;
			}
			const container = containerCx.value;
			return bounds.size.width <= container.width && bounds.size.height <= container.height;
		}
	);
	const isFocused = useCompute(
		windowCx.$focusedId,
		({ value: focusedId }) => focusedId === windowId,
		[windowId]
	);

	const windowRef = React.useRef<HTMLDivElement>(null);
	const layoutRef = React.useRef<Pick<TWindow, 'bounds' | 'zIndex'> | null>(null);
	const isDragging = React.useRef(false);
	const isPendingDrag = React.useRef(false);
	const dragStart = React.useRef({ pointerX: 0, pointerY: 0, windowX: 0, windowY: 0 });

	// MARK: - Actions

	const applyPosition = React.useCallback((el: HTMLElement, position: TPosition): void => {
		el.style.right = '';
		el.style.bottom = '';
		el.style.transform = '';
		if (isAbsolutePosition(position)) {
			el.style.left = `${position.x}px`;
			el.style.top = `${position.y}px`;
			return;
		}
		// Anchor: use CSS so the browser handles layout and resize
		const ox = position.offset?.x ?? 0;
		const oy = position.offset?.y ?? 0;
		el.style.left = '';
		if (position.x === 'start') {
			el.style.left = `${ox}px`;
		} else if (position.x === 'end') {
			el.style.right = `${ox}px`;
		} else {
			el.style.left = '50%';
		}
		el.style.top = '';
		if (position.y === 'start') {
			el.style.top = `${oy}px`;
		} else if (position.y === 'end') {
			el.style.bottom = `${oy}px`;
		} else {
			el.style.top = '50%';
		}
		const tx = position.x === 'center' ? '-50%' : '0';
		const ty = position.y === 'center' ? '-50%' : '0';
		el.style.transform = tx !== '0' || ty !== '0' ? `translate(${tx}, ${ty})` : '';
	}, []);

	const getAbsolutePosition = React.useCallback(
		(
			position: TPosition | null,
			el: HTMLElement | null,
			containerEl: HTMLElement | null
		): TAbsolutePosition => {
			if (isAbsolutePosition(position)) {
				return { x: position.x, y: position.y };
			}
			if (el != null && containerEl != null) {
				const rect = el.getBoundingClientRect();
				const containerRect = containerEl.getBoundingClientRect();
				return {
					x: rect.left - containerRect.left,
					y: rect.top - containerRect.top
				};
			}
			return { x: 0, y: 0 };
		},
		[]
	);

	const applyLayout = React.useCallback(
		(el: HTMLElement, bounds: TBounds, zIndex: number) => {
			el.style.position = 'absolute';
			el.style.width = `${bounds.size.width}px`;
			el.style.height = `${bounds.size.height}px`;
			el.style.zIndex = String(zIndex);
			applyPosition(el, bounds.position);
		},
		[applyPosition]
	);

	const handleWindowPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;

			windowCx.bringToFront(windowId);

			// Ignore pointer events on non-draggable regions or form elements
			if (
				target.closest('[data-drag-region]') == null ||
				(excludeFromDrag !== '' && target.closest(excludeFromDrag) != null)
			) {
				return;
			}

			// Ignore pointer events on maximized windows
			if (isMaximized) {
				return;
			}

			const layout = layoutRef.current;
			const position = layout?.bounds?.position ?? null;
			const { x: windowX, y: windowY } = getAbsolutePosition(
				position,
				windowRef.current,
				windowCx.containerRef.current
			);

			dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, windowX, windowY };

			if (dragThreshold != null) {
				isPendingDrag.current = true;
			} else {
				e.currentTarget.setPointerCapture(e.pointerId);
				isDragging.current = true;
				windowCx.startDrag(windowId);
			}
		},
		[dragThreshold, excludeFromDrag, getAbsolutePosition, isMaximized, windowCx, windowId]
	);

	const handleWindowPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			// If the window is pending a drag, and the drag threshold has been crossed, start the drag
			if (isPendingDrag.current && dragThreshold != null) {
				const dx = e.clientX - dragStart.current.pointerX;
				const dy = e.clientY - dragStart.current.pointerY;
				if (Math.sqrt(dx * dx + dy * dy) >= dragThreshold) {
					isPendingDrag.current = false;
					isDragging.current = true;
					e.currentTarget.setPointerCapture(e.pointerId);
					document.body.style.cursor = 'grabbing';
					windowCx.startDrag(windowId);
				}
			}

			if (!isDragging.current) {
				return;
			}

			const dx = e.clientX - dragStart.current.pointerX;
			const dy = e.clientY - dragStart.current.pointerY;
			windowCx.setPosition(
				windowId,
				dragStart.current.windowX + dx,
				dragStart.current.windowY + dy
			);
		},
		[dragThreshold, windowCx, windowId]
	);

	const handleWindowPointerUp = React.useCallback(() => {
		// Threshold never crossed, so treat as a normal click and let native events fire instead
		if (isPendingDrag.current) {
			isPendingDrag.current = false;
			return;
		}

		// If the window was being dragged, end the drag and reset the cursor
		if (isDragging.current) {
			windowCx.endDrag();
			if (dragThreshold != null) {
				document.body.style.cursor = '';
			}
		}

		isDragging.current = false;
	}, [dragThreshold, windowCx]);

	const handleClose = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.close(windowId);
			onClose?.();
		},
		[windowCx, windowId, onClose]
	);

	const handleMinimize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.minimize(windowId);
			onMinimize?.();
		},
		[windowCx, windowId, onMinimize]
	);

	const handleMaximize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.maximize(windowId);
			onMaximize?.();
		},
		[windowCx, windowId, onMaximize]
	);

	const setWindowRef = React.useCallback(
		(el: HTMLDivElement | null) => {
			windowRef.current = el;

			// Update layout as soon as the ref is set
			if (el != null) {
				const w = $window.get();
				applyLayout(el, w.bounds, w.zIndex);
				layoutRef.current = { bounds: w.bounds, zIndex: w.zIndex };
			}
		},
		[$window, applyLayout]
	);

	// MARK: - Effects

	useListener(
		$window,
		({ value }) => {
			const el = windowRef.current;
			if (el != null) {
				applyLayout(el, value.bounds, value.zIndex);
			}
			layoutRef.current = { bounds: value.bounds, zIndex: value.zIndex };
		},
		[$window, applyLayout]
	);

	// MARK: - UI

	return (
		<AnimatePresence>
			{isVisible && (
				<div ref={setWindowRef}>
					<motion.div
						className={cn(
							'h-full w-full overflow-hidden',
							transparent ? 'bg-transparent shadow-none' : 'shadow-2xl',
							!transparent && !isMaximized && 'rounded-2xl'
						)}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						onPointerDown={handleWindowPointerDown}
						onPointerMove={handleWindowPointerMove}
						onPointerUp={handleWindowPointerUp}
					>
						{/* Traffic lights */}
						{!transparent && (
							<div className="group absolute top-0 left-0 z-10 flex h-11 items-center gap-4 pl-3 sm:h-8 sm:gap-[10px] sm:pl-2">
								{/* Close */}
								{trafficLights.close ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FF5F57] sm:size-3.5',
											isFocused ? 'bg-[#FF5F57]' : 'bg-base-200'
										)}
										onClick={handleClose}
									>
										<XIcon
											strokeWidth={6}
											className={cn(
												'size-3 text-[#4c0000]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
												isFocused ? 'max-sm:block' : 'max-sm:hidden'
											)}
										/>
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}

								{/* Minimize */}
								{trafficLights.minimize && !isMaximized ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FFBD2E] sm:size-3.5',
											isFocused ? 'bg-[#FFBD2E]' : 'bg-base-200'
										)}
										onClick={handleMinimize}
									>
										<MinusIcon
											strokeWidth={6}
											className={cn(
												'size-3 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
												isFocused ? 'max-sm:block' : 'max-sm:hidden'
											)}
										/>
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}

								{/* Maximize */}
								{trafficLights.maximize && canToggleMaximize ? (
									<button
										className={cn(
											'relative flex size-4.5 cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#28C840] sm:size-3.5',
											isFocused ? 'bg-[#28C840]' : 'bg-base-200'
										)}
										onClick={handleMaximize}
									>
										{isMaximized ? (
											<ChevronsRightLeftIcon
												strokeWidth={5}
												className={cn(
													'size-3 rotate-45 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
													isFocused ? 'max-sm:block' : 'max-sm:hidden'
												)}
											/>
										) : (
											<ChevronsLeftRightIcon
												strokeWidth={5}
												className={cn(
													'size-3 rotate-45 text-[#5a3500]/60 sm:hidden sm:size-2.5 sm:group-hover:block',
													isFocused ? 'max-sm:block' : 'max-sm:hidden'
												)}
											/>
										)}
									</button>
								) : (
									<div className="bg-base-200 size-4.5 rounded-full ring-1 ring-black/20 sm:size-3.5" />
								)}
							</div>
						)}

						{children}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export interface TDraggableWindowProps {
	windowId: TWindowId;
	windowCx: WindowCx;
	transparent?: boolean;
	dragThreshold?: number;
	excludeFromDrag?: string;
	onClose?: () => void;
	onMinimize?: () => void;
	onMaximize?: () => void;
	children: React.ReactNode;
}
