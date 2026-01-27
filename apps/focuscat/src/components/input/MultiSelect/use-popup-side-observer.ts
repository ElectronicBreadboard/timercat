import React from 'react';

/**
 * Observes popup's data-side attribute to sync container styling with popup position.
 *
 * Why MutationObserver? The popup is in a Portal (different DOM tree), so we can't
 * use CSS to style the container based on popup position. We observe data-side which
 * base-ui sets after positioning.
 *
 * Why requestAnimationFrame polling? Portal content mounts asynchronously after the
 * parent renders, so popupRef.current is initially null. We poll until it's available.
 */
export function usePopupSideObserver(
	popupRef: React.RefObject<HTMLDivElement | null>,
	enabled: boolean,
	onSideChange: (side: 'top' | 'bottom') => void
) {
	React.useLayoutEffect(() => {
		if (!enabled) {
			onSideChange('bottom');
			return;
		}

		let frameId: number | null = null;
		let observer: MutationObserver | null = null;

		const setup = () => {
			const popup = popupRef.current;
			if (popup == null) {
				frameId = requestAnimationFrame(setup);
				return;
			}

			// Read initial side
			const side = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
			if (side != null) {
				onSideChange(side);
			}

			// Watch for changes (base-ui may flip position on scroll/resize)
			observer = new MutationObserver(() => {
				const newSide = popup.getAttribute('data-side') as 'top' | 'bottom' | null;
				if (newSide != null) {
					onSideChange(newSide);
				}
			});
			observer.observe(popup, { attributes: true, attributeFilter: ['data-side'] });
		};

		setup();

		return () => {
			if (frameId != null) cancelAnimationFrame(frameId);
			observer?.disconnect();
		};
	}, [popupRef, enabled, onSideChange]);
}
