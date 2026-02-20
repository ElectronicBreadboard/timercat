import { cn, MinusIcon, XIcon } from '@repo/ui';
import { useCompute, useFeatureState } from 'feature-react/state';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import type { TWindowId, WindowCx } from '@/features/windows';

export const DraggableWindow: React.FC<TDraggableWindowProps> = (props) => {
	const { windowId, windowCx, children } = props;

	const { trafficLights, size, isOpen, position, zIndex } = useFeatureState(
		windowCx.windows[windowId]
	);
	const isFocused = useCompute(
		windowCx.$focusedId,
		({ value: focusedId }) => focusedId === windowId,
		[windowId]
	);

	const windowRef = React.useRef<HTMLDivElement>(null);
	const isDragging = React.useRef(false);
	const dragStart = React.useRef({ pointerX: 0, pointerY: 0, windowX: 0, windowY: 0 });

	// MARK: - Actions

	const handleWindowPointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const target = e.target as HTMLElement;

			windowCx.bringToFront(windowId);

			// Ignore clicks on non-draggable regions or form elements
			if (
				target.closest('[data-drag-region]') == null ||
				target.closest('button, a, input, select, textarea') != null
			) {
				return;
			}

			const rect = windowRef.current?.getBoundingClientRect();
			const windowX = position?.x ?? rect?.left ?? 0;
			const windowY = position?.y ?? rect?.top ?? 0;

			e.currentTarget.setPointerCapture(e.pointerId);
			isDragging.current = true;
			dragStart.current = { pointerX: e.clientX, pointerY: e.clientY, windowX, windowY };
		},
		[position, windowCx, windowId]
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

	// MARK: - UI

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					ref={windowRef}
					data-window
					style={{
						width: size.width,
						height: size.height,
						...(position == null
							? {
									position: 'absolute',
									top: '50%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									zIndex
								}
							: {
									position: 'absolute',
									top: position.y,
									left: position.x,
									zIndex
								})
					}}
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.95 }}
					transition={{ duration: 0.15, ease: 'easeOut' }}
					className="overflow-hidden rounded-lg shadow-2xl"
					onPointerDown={handleWindowPointerDown}
					onPointerMove={handleWindowPointerMove}
					onPointerUp={handleWindowPointerUp}
				>
					{/* Traffic lights */}
					<div className="group absolute top-0 left-0 z-10 flex h-8 items-center gap-[6px] pl-2">
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
						{trafficLights.minimize ? (
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
