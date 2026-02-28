import React from 'react';
import { TTimerViewCx } from './TimerViewCx';

/**
 * Plays wind-up tick sounds on value changes using a sliding window.
 * A window of `windowSize` variants cycles sequentially for natural variety.
 * The window's position slides based on drag speed — slow drags use
 * lower variants (1-5), fast drags shift to higher variants (7-11).
 */
export function useWindUpTick(cx: TTimerViewCx, options: TWindUpTickOptions = {}) {
	const { tickCount = 11, windowSize = 5, throttleMs = 30, slowMs = 200 } = options;

	const prevValueRef = React.useRef<number | null>(null);
	const lastPlayTimeRef = React.useRef(0);
	const cycleIndexRef = React.useRef(0);

	const reset = React.useCallback(() => {
		prevValueRef.current = null;
		cycleIndexRef.current = 0;
	}, []);

	const tick = React.useCallback(
		(value: number) => {
			if (prevValueRef.current !== null && prevValueRef.current !== value) {
				const now = Date.now();
				const elapsed = now - lastPlayTimeRef.current;
				if (elapsed >= throttleMs) {
					// Speed: 0 (slow) to 1 (fast)
					const speed = 1 - Math.min((elapsed - throttleMs) / (slowMs - throttleMs), 1);

					// Slide window start based on speed: 0 at slow, (tickCount - windowSize) at fast
					const windowStart = Math.round(speed * (tickCount - windowSize));

					// Cycle within the window
					const direction = value > prevValueRef.current ? 1 : -1;
					cycleIndexRef.current = (cycleIndexRef.current + direction + windowSize) % windowSize;

					const index = windowStart + cycleIndexRef.current;
					const id = `wind-up-tick-${index + 1}`;
					cx.playSound?.(id);
					lastPlayTimeRef.current = now;
				}
			}
			prevValueRef.current = value;
		},
		[tickCount, windowSize, throttleMs, slowMs, cx]
	);

	return { reset, tick };
}

interface TWindUpTickOptions {
	tickCount?: number;
	/** How many variants to cycle through at any given speed. Defaults to 5. */
	windowSize?: number;
	/** Minimum ms between ticks before the next one can play. Defaults to 30. */
	throttleMs?: number;
	/** Time between ticks (ms) at which drag is considered "slow". Defaults to 200. */
	slowMs?: number;
}
