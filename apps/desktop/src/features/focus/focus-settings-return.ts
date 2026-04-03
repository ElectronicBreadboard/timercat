import { specta } from '@/environment';

export async function returnToMainFromFocusSettings(path: string): Promise<void> {
	// Reset the hidden Settings window so a later normal open
	// does not land back on the form route that Session Setup temporarily opened
	await specta.commands.hideSettingsWindow();
	await specta.commands.navigateSettingsWindowToPath('/window/settings/focus');
	await specta.commands.showMainWindowAtPath(path);
}

export function appendReturnSearch(path: string, params: Record<string, string>): string {
	const [pathname, search = ''] = path.split('?');
	const nextSearch = new URLSearchParams(search);
	for (const [key, value] of Object.entries(params)) {
		nextSearch.set(key, value);
	}
	const searchString = nextSearch.toString();
	return `${pathname}${searchString.length > 0 ? `?${searchString}` : ''}`;
}
