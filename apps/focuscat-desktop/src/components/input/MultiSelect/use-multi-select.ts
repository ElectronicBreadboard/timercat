import React from 'react';
import { useMemoCleanup } from '@/hooks';
import { MultiSelectCx, type TMultiSelectCxOptions } from './MultiSelectCx';

export function useMultiSelect<GItem extends { id: string }>(
	options: TMultiSelectCxOptions<GItem>
): MultiSelectCx<GItem> {
	const id = React.useId();
	const cx = useMemoCleanup(() => {
		const multiSelectCx = new MultiSelectCx<GItem>(id, options);
		return [multiSelectCx, () => multiSelectCx.unmount()];
	}, []);

	React.useEffect(() => {
		cx.applyOptions(options);
	}, [cx, options]);

	return cx;
}
