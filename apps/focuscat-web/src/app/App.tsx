import { useBoundingRectObserver } from '@repo/ui';
import { useCompute } from 'feature-react/state';
import React from 'react';
import { useWindowCx } from '@/features/window';
import { Fireflies, WindowCanvas } from './components';

export const App: React.FC = () => {
	const windowCx = useWindowCx();
	const containerReady = useCompute(
		windowCx.$containerRect,
		({ value: rect }) => rect.width > 0 && rect.height > 0
	);
	const fireflyCount = useCompute(windowCx.$breakpoint, ({ value: breakpoint }) =>
		breakpoint === 'sm' ? 5 : breakpoint === 'md' ? 10 : 18
	);

	// MARK: - Actions

	const handleBackgroundClick = React.useCallback(() => {
		windowCx.clearFocus();
	}, [windowCx]);

	// MARK: - Effects

	useBoundingRectObserver(
		windowCx.containerRef,
		{ width: 0, height: 0 },
		(rect) => {
			windowCx.setContainerRect(rect.width ?? 0, rect.height ?? 0);
		},
		[windowCx]
	);

	// MARK: - UI

	return (
		<div ref={windowCx.containerRef} className="relative h-dvh w-screen overflow-hidden">
			{/* Background */}
			<div
				className={`absolute inset-0 bg-[url('/illustrations/backgrounds/japanese-lofi.png')] bg-cover bg-center bg-no-repeat`}
				onClick={handleBackgroundClick}
			/>
			<Fireflies count={containerReady ? fireflyCount : 0} />

			{/* Windows */}
			{containerReady && <WindowCanvas windowCx={windowCx} />}
		</div>
	);
};
