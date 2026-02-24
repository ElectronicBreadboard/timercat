import { cn, MinusIcon, XIcon } from '@repo/ui';
import { useCompute, useListener } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import {
	isAbsolutePosition,
	type TAbsolutePosition,
	type TBounds,
	type TPosition,
	type TWindow,
	type TWindowId,
	type WindowCx
} from '@/features/window';

export const DraggableWindow: React.FC<TDraggableWindowProps> = (props) => {
	const { windowId, windowCx, transparent = false, edgePaddingPx = 16, children } = props;
	const $window = windowCx.windows[windowId];

	const isOpen = useCompute($window, ({ value }) => value.isOpen);
	const trafficLights = useCompute($window, ({ value }) => value.trafficLights);
	const isMaximized = useCompute($window, ({ value }) => value.boundsBeforeMaximize != null);
	const isFocused = useCompute(
		windowCx.$focusedId,
		({ value: focusedId }) => focusedId === windowId,
		[windowId]
	);

	const windowRef = React.useRef<HTMLDivElement>(null);
	const layoutRef = React.useRef<Pick<TWindow, 'bounds' | 'zIndex'> | null>(null);
	const isDragging = React.useRef(false);
	const dragStart = React.useRef({ pointerX: 0, pointerY: 0, windowX: 0, windowY: 0 });

	// MARK: - Actions

	const applyPosition = React.useCallback(
		(el: HTMLElement, position: TPosition): void => {
			el.style.right = '';
			el.style.bottom = '';
			el.style.transform = '';
			if (isAbsolutePosition(position)) {
				el.style.left = `${position.x}px`;
				el.style.top = `${position.y}px`;
				return;
			}
			// Anchor: use CSS so the browser handles layout and resize
			el.style.left = '';
			if (position.x === 'start') {
				el.style.left = `${edgePaddingPx}px`;
			} else if (position.x === 'end') {
				el.style.right = `${edgePaddingPx}px`;
			} else {
				el.style.left = '50%';
			}
			el.style.top = '';
			if (position.y === 'start') {
				el.style.top = `${edgePaddingPx}px`;
			} else if (position.y === 'end') {
				el.style.bottom = `${edgePaddingPx}px`;
			} else {
				el.style.top = '50%';
			}
			const tx = position.x === 'center' ? '-50%' : '0';
			const ty = position.y === 'center' ? '-50%' : '0';
			el.style.transform = tx !== '0' || ty !== '0' ? `translate(${tx}, ${ty})` : '';
		},
		[edgePaddingPx]
	);

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
				target.closest('button, a, input, select, textarea') != null
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

			e.currentTarget.setPointerCapture(e.pointerId);
			isDragging.current = true;
			dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, windowX, windowY };
		},
		[getAbsolutePosition, isMaximized, windowCx, windowId]
	);

	const handleWindowPointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
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
		[windowCx, windowId]
	);

	const handleWindowPointerUp = React.useCallback(() => {
		isDragging.current = false;
	}, []);

	const handleClose = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.close(windowId);
		},
		[windowCx, windowId]
	);

	const handleMinimize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.minimize(windowId);
		},
		[windowCx, windowId]
	);

	const handleMaximize = React.useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			e.stopPropagation();
			windowCx.maximize(windowId);
		},
		[windowCx, windowId]
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
			{isOpen && (
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
											'relative flex size-[18px] cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FF5F57] sm:size-[14px]',
											isFocused ? 'bg-[#FF5F57]' : 'bg-base-200'
										)}
										onClick={handleClose}
									>
										<XIcon
											size={8}
											strokeWidth={6}
											className="hidden text-[#4c0000]/60 group-hover:block"
										/>
									</button>
								) : (
									<div className="bg-base-200 size-[18px] rounded-full ring-1 ring-black/20 sm:size-[14px]" />
								)}

								{/* Minimize */}
								{trafficLights.minimize && !isMaximized ? (
									<button
										className={cn(
											'relative flex size-[18px] cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FFBD2E] sm:size-[14px]',
											isFocused ? 'bg-[#FFBD2E]' : 'bg-base-200'
										)}
										onClick={handleMinimize}
									>
										<MinusIcon
											size={8}
											strokeWidth={6}
											className="hidden text-[#5a3500]/60 group-hover:block"
										/>
									</button>
								) : (
									<div className="bg-base-200 size-[18px] rounded-full ring-1 ring-black/20 sm:size-[14px]" />
								)}

								{/* Maximize */}
								{trafficLights.maximize ? (
									<button
										className={cn(
											'size-[18px] cursor-default rounded-full ring-1 ring-black/20 group-hover:bg-[#28C840] sm:size-[14px]',
											isFocused ? 'bg-[#28C840]' : 'bg-base-200'
										)}
										aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
										onClick={handleMaximize}
									/>
								) : (
									<div className="bg-base-200 size-[18px] rounded-full ring-1 ring-black/20 sm:size-[14px]" />
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
	edgePaddingPx?: number;
	children: React.ReactNode;
}
