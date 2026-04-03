import { specta } from '@/environment';
import { parseSearchString } from './parse';

export function parseFlowReturnSearch(search: Record<string, unknown>): TFlowReturnSearch {
	const returnTargetKind = parseSearchString(search['returnTargetKind']);
	if (returnTargetKind === 'cat') {
		return { returnTargetKind };
	}

	if (returnTargetKind === 'main') {
		const returnTargetHref = parseSearchString(search['returnTargetHref']);
		if (returnTargetHref != null) {
			return { returnTargetKind, returnTargetHref };
		}
	}

	return {};
}

export function toFlowReturnTarget(search: TFlowReturnSearch): TFlowReturnTarget | undefined {
	if (search.returnTargetKind === 'cat') {
		return { kind: 'cat' };
	}

	if (search.returnTargetKind === 'main' && search.returnTargetHref != null) {
		return { kind: 'main', href: search.returnTargetHref };
	}

	return undefined;
}

export function buildFlowReturnSearch(target?: TFlowReturnTarget): TFlowReturnSearch {
	if (target == null) {
		return {};
	}

	if (target.kind === 'cat') {
		return { returnTargetKind: 'cat' };
	}

	return {
		returnTargetKind: 'main',
		returnTargetHref: target.href
	};
}

export function appendSearchParams(
	path: string,
	params: Record<string, string | undefined>
): string {
	const [pathname, search = ''] = path.split('?');
	const nextSearch = new URLSearchParams(search);

	for (const [key, value] of Object.entries(params)) {
		if (value == null) {
			nextSearch.delete(key);
		} else {
			nextSearch.set(key, value);
		}
	}

	const searchString = nextSearch.toString();
	return `${pathname}${searchString.length > 0 ? `?${searchString}` : ''}`;
}

export function appendFlowReturnSearch(path: string, target?: TFlowReturnTarget): string {
	const { returnTargetKind, returnTargetHref } = buildFlowReturnSearch(target);

	return appendSearchParams(path, {
		returnTargetKind,
		returnTargetHref
	});
}

export function appendFlowReturnTargetParams(
	target: TFlowReturnTarget,
	params: Record<string, string | undefined>
): TFlowReturnTarget {
	if (target.kind === 'cat') {
		return target;
	}

	return {
		kind: 'main',
		href: appendSearchParams(target.href, params)
	};
}

export async function completeFlowReturn(
	target?: TFlowReturnTarget,
	fallbackHref = '/window/main'
): Promise<void> {
	if (target?.kind === 'cat') {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
		// Reset the hidden Main window so a later expand opens the normal dashboard again.
		await specta.commands.navigateMainWindowToPath('/window/main');
		return;
	}

	await specta.commands.showMainWindowAtPath(target?.href ?? fallbackHref);
}

export async function completeFocusSettingsReturn(target: TFlowReturnTarget): Promise<void> {
	// Reset the hidden Settings window so a later normal open
	// does not land back on the form route that Session Setup temporarily opened
	await specta.commands.hideSettingsWindow();
	await specta.commands.navigateSettingsWindowToPath('/window/settings/focus');
	await completeFlowReturn(target);
}

export type TFlowReturnTarget = { kind: 'cat' } | { kind: 'main'; href: string };

export interface TFlowReturnSearch {
	returnTargetKind?: 'cat' | 'main';
	returnTargetHref?: string;
}
