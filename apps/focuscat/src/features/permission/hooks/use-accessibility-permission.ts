import React from 'react';
import { specta } from '@/environment';

export function useAccessibilityPermission() {
	const [granted, setGranted] = React.useState<boolean | null>(null);

	const checkPermission = React.useCallback(async () => {
		const isGranted = await specta.commands.isAccessibilityGranted();
		setGranted(isGranted);
	}, []);

	React.useEffect(() => {
		checkPermission();

		// Re-check when window gains focus (user may have changed permissions)
		const handleFocus = () => checkPermission();
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [checkPermission]);

	const openSettings = React.useCallback(() => {
		specta.commands.openAccessibilitySettings();
	}, []);

	return { granted, openSettings };
}
