import { getCurrentWindow, type Theme as TauriTheme } from '@tauri-apps/api/window';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { useSettingsCx } from '@/features/settings';

export const ThemeCxProvider: React.FC<TThemeCxProviderProps> = (props) => {
	const { children } = props;
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Actions

	const applyTheme = React.useCallback((theme: TauriTheme) => {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, []);

	// MARK: - Effects

	// Apply theme when setting changes
	React.useEffect(() => {
		const appTheme = settings.appearance.theme;
		(async () => {
			if (appTheme === 'auto') {
				// Follow system: set native to null, then read effective theme
				await getCurrentWindow().setTheme(null);
				const effectiveTheme = await getCurrentWindow().theme();
				if (effectiveTheme != null) {
					applyTheme(effectiveTheme);
				}
			} else {
				// Explicit theme: set native and CSS
				await getCurrentWindow().setTheme(appTheme);
				applyTheme(appTheme);
			}
		})();
	}, [settings.appearance.theme, applyTheme]);

	// Listen for system theme changes (only matters when set to 'auto')
	React.useEffect(() => {
		const unlistenPromise = getCurrentWindow().onThemeChanged(({ payload }) => {
			// Only apply if we're in auto mode
			if (settings.appearance.theme === 'auto') {
				applyTheme(payload);
			}
		});

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, [settings.appearance.theme, applyTheme]);

	// MARK: - UI

	return <>{children}</>;
};

interface TThemeCxProviderProps {
	children: React.ReactNode;
}
