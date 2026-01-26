import React from 'react';

/**
 * Manages popup viewport constraints and positioning.
 *
 * Syncs with base-ui's positioning (via data-side attribute) and constrains
 * popup height to available viewport space.
 */
export function usePopupViewport(options: TUsePopupViewportOptions) {
	const { enabled, containerRef, popupRef, padding = 16, minHeight = 100 } = options;

	const [side, setSide] = React.useState<'top' | 'bottom'>('bottom');

	// MARK: - Effects

	React.useLayoutEffect(() => {
		if (!enabled) {
			setSide('bottom');
			return;
		}

		let frameId: number | null = null;
		let observer: MutationObserver | null = null;
		let observedPopup: HTMLDivElement | null = null;

		const updatePopup = () => {
			const popup = popupRef.current;
			const container = containerRef.current;
			if (popup == null || container == null) {
				return;
			}

			// Sync side state with base-ui's positioning decision
			const popupSide = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
			if (popupSide != null) {
				setSide(popupSide);
			}

			// Use container bounds (popup anchor), not input (may wrap to second line)
			const containerRect = container.getBoundingClientRect();
			const availableHeight =
				popupSide === 'top'
					? containerRect.top - padding
					: window.innerHeight - containerRect.bottom - padding;

			popup.style.maxHeight = `${Math.max(minHeight, availableHeight)}px`;
		};

		const waitForPopup = () => {
			if (popupRef.current == null) {
				frameId = requestAnimationFrame(waitForPopup);
				return;
			}

			observedPopup = popupRef.current;
			updatePopup();

			// Watch for position flips (base-ui may flip when near viewport edge)
			observer = new MutationObserver(updatePopup);
			observer.observe(observedPopup, { attributes: true, attributeFilter: ['data-side'] });
		};

		const handleScroll = (e: Event) => {
			// Ignore scrolls inside popup (user scrolling through results)
			if (observedPopup?.contains(e.target as Node)) {
				return;
			}
			updatePopup();
		};

		waitForPopup();
		window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

		return () => {
			if (frameId != null) {
				cancelAnimationFrame(frameId);
			}
			observer?.disconnect();
			window.removeEventListener('scroll', handleScroll, { capture: true });
			if (observedPopup != null) {
				observedPopup.style.maxHeight = '';
			}
		};
	}, [enabled, containerRef, popupRef, padding, minHeight]);

	return { side };
}

// MARK: - Types

export interface TUsePopupViewportOptions {
	/** Whether viewport constraint is active */
	enabled: boolean;
	/** Reference to the anchor/container element */
	containerRef: React.RefObject<HTMLDivElement | null>;
	/** Reference to the popup element */
	popupRef: React.RefObject<HTMLDivElement | null>;
	/** Minimum gap (px) between popup edge and viewport edge */
	padding?: number;
	/** Minimum popup height (px) even when viewport space is limited */
	minHeight?: number;
}
