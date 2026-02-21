import { cn, MinusIcon, XIcon } from '@repo/ui';
import { useCompute, useListener } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import type { TBounds, TWindow, TWindowId, WindowCx } from '@/features/window';

export const DraggableWindow: React.FC<TDraggableWindowProps> = (props) => {
	const { windowId, windowCx, children } = props;
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

	const applyLayout = React.useCallback((el: HTMLElement, bounds: TBounds, zIndex: number) => {
		el.style.position = 'absolute';
		el.style.width = `${bounds.size.width}px`;
		el.style.height = `${bounds.size.height}px`;
		el.style.zIndex = String(zIndex);
		if (bounds.position == null) {
			el.style.top = '50%';
			el.style.left = '50%';
			el.style.transform = 'translate(-50%, -50%)';
		} else {
			el.style.top = `${bounds.position.y}px`;
			el.style.left = `${bounds.position.x}px`;
			el.style.transform = '';
		}
	}, []);

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

			const rect = windowRef.current?.getBoundingClientRect();
			const layout = layoutRef.current;
			const windowX = layout?.bounds?.position?.x ?? rect?.left ?? 0;
			const windowY = layout?.bounds?.position?.y ?? rect?.top ?? 0;

			e.currentTarget.setPointerCapture(e.pointerId);
			isDragging.current = true;
			dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, windowX, windowY };
		},
		[isMaximized, windowCx, windowId]
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
			if (el != null) applyLayout(el, value.bounds, value.zIndex);
			layoutRef.current = { bounds: value.bounds, zIndex: value.zIndex };
		},
		[$window]
	);

	// MARK: - UI

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					ref={setWindowRef}
					data-window
					style={{}}
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={{ duration: 0.15, ease: 'easeOut' }}
					className={cn('overflow-hidden shadow-2xl', !isMaximized && 'rounded-2xl')}
					onPointerDown={handleWindowPointerDown}
					onPointerMove={handleWindowPointerMove}
					onPointerUp={handleWindowPointerUp}
				>
					{/* Traffic lights */}
					<div className="group absolute top-0 left-0 z-10 flex h-8 items-center gap-[8px] pl-2">
						{/* Close */}
						{trafficLights.close ? (
							<button
								className={cn(
									'relative flex size-[12px] cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FF5F57]',
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
							<div className="bg-base-200 size-[12px] rounded-full ring-1 ring-black/20" />
						)}

						{/* Minimize */}
						{trafficLights.minimize && !isMaximized ? (
							<button
								className={cn(
									'relative flex size-[12px] cursor-default items-center justify-center rounded-full ring-1 ring-black/20 group-hover:bg-[#FFBD2E]',
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
							<div className="bg-base-200 size-[12px] rounded-full ring-1 ring-black/20" />
						)}

						{/* Maximize */}
						{trafficLights.maximize ? (
							<button
								className={cn(
									'size-[12px] cursor-default rounded-full ring-1 ring-black/20 group-hover:bg-[#28C840]',
									isFocused ? 'bg-[#28C840]' : 'bg-base-200'
								)}
								onClick={handleMaximize}
							/>
						) : (
							<div className="bg-base-200 size-[12px] rounded-full ring-1 ring-black/20" />
						)}
					</div>

					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export interface TDraggableWindowProps {
	windowId: TWindowId;
	windowCx: WindowCx;
	children: React.ReactNode;
}
