export function mergeTinyRunsByKey<TBlock extends TTimeRange, TKey>(
	blocks: TBlock[],
	options: TMergeTinyRunsByKeyOptions<TBlock, TKey>
): TBlock[] {
	const { minWidthPx, getKey, msToPx, mergeBlocks } = options;
	const result: TBlock[] = [];
	let buffer: TBlock[] = [];
	let currentKey: TKey | undefined = undefined;

	const flushBuffer = (): void => {
		if (!buffer.length) {
			return;
		}
		result.push(mergeBlocks(buffer));
		buffer = [];
	};

	const tryMergeBufferBackward = (): boolean => {
		const lastResult = result[result.length - 1];
		if (
			lastResult == null ||
			getKey(lastResult) !== currentKey ||
			getRangeWidthPx(buffer, msToPx) >= minWidthPx
		) {
			return false;
		}

		result[result.length - 1] = mergeBlocks([lastResult, ...buffer]);
		buffer = [];
		return true;
	};

	for (const block of blocks) {
		const key = getKey(block);
		const isKeyChange = key !== currentKey;

		if (isKeyChange && buffer.length > 0) {
			if (!tryMergeBufferBackward()) {
				flushBuffer();
			}
		}

		currentKey = key;
		buffer.push(block);

		if (getRangeWidthPx(buffer, msToPx) >= minWidthPx) {
			flushBuffer();
		}
	}

	if (buffer.length > 0) {
		if (!tryMergeBufferBackward()) {
			flushBuffer();
		}
	}

	return result;
}

export function groupConsecutiveByKey<TInput extends TTimeRange, TOutput, TKey>(
	blocks: TInput[],
	options: TGroupConsecutiveByKeyOptions<TInput, TOutput, TKey>
): TOutput[] {
	const { getKey, mergeGroup } = options;
	const result: TOutput[] = [];
	let currentGroup: TInput[] = [];
	let currentKey: TKey | undefined = undefined;

	const flushGroup = (): void => {
		if (!currentGroup.length) {
			return;
		}

		result.push(mergeGroup(currentGroup));
		currentGroup = [];
	};

	for (const block of blocks) {
		const key = getKey(block);

		if (currentKey !== undefined && key !== currentKey) {
			flushGroup();
		}

		currentGroup.push(block);
		currentKey = key;
	}

	flushGroup();
	return result;
}

export function mergeTinyGroupsWithNeighbors<TGroup extends TTimeRange, TMerged extends TTimeRange>(
	groups: TGroup[],
	options: TMergeTinyGroupsWithNeighborsOptions<TGroup, TMerged>
): Array<TGroup | TMerged> {
	const { minWidthPx, getWidthPx, mergeBlocks } = options;
	const result: Array<TGroup | TMerged> = [];
	let tinyBuffer: Array<TGroup | TMerged> = [];

	const flushTinyBuffer = (): void => {
		if (!tinyBuffer.length) {
			return;
		}

		result.push(mergeBlocks(tinyBuffer));
		tinyBuffer = [];
	};

	for (const group of groups) {
		const isLargeEnough = getWidthPx(group) >= minWidthPx;

		if (isLargeEnough) {
			if (!tinyBuffer.length) {
				result.push(group);
				continue;
			}

			const leftNeighbor = result[result.length - 1];
			if (leftNeighbor == null) {
				result.push(mergeBlocks([...tinyBuffer, group]));
				tinyBuffer = [];
				continue;
			}

			const leftWidth = getWidthPx(leftNeighbor);
			const rightWidth = getWidthPx(group);

			if (leftWidth <= rightWidth) {
				result.pop();
				result.push(mergeBlocks([leftNeighbor, ...tinyBuffer]));
				result.push(group);
			} else {
				result.push(mergeBlocks([...tinyBuffer, group]));
			}

			tinyBuffer = [];
			continue;
		}

		tinyBuffer.push(group);
	}

	if (tinyBuffer.length > 0) {
		const leftNeighbor = result.pop();
		if (leftNeighbor != null) {
			tinyBuffer = [leftNeighbor, ...tinyBuffer];
		}
		flushTinyBuffer();
	}

	return result;
}

export function mergeAdjacentBlocksByKey<TBlock, TKey>(
	blocks: TBlock[],
	options: TMergeAdjacentBlocksByKeyOptions<TBlock, TKey>
): TBlock[] {
	const { getMergeKey, mergeBlocks } = options;
	const result: TBlock[] = [];

	for (const block of blocks) {
		const last = result[result.length - 1];
		const blockKey = getMergeKey(block);
		const lastKey = last != null ? getMergeKey(last) : undefined;

		if (last != null && blockKey !== undefined && blockKey === lastKey) {
			result[result.length - 1] = mergeBlocks([last, block]);
			continue;
		}

		result.push(block);
	}

	return result;
}

function getRangeWidthPx<TBlock extends TTimeRange>(
	blocks: TBlock[],
	msToPx: (ms: number) => number
): number {
	const first = blocks[0];
	const last = blocks[blocks.length - 1];

	if (first == null || last == null) {
		return 0;
	}

	return msToPx(last.endMs) - msToPx(first.startMs);
}

interface TMergeTinyRunsByKeyOptions<TBlock extends TTimeRange, TKey> {
	minWidthPx: number;
	getKey: (block: TBlock) => TKey;
	msToPx: (ms: number) => number;
	mergeBlocks: (blocks: TBlock[]) => TBlock;
}

interface TGroupConsecutiveByKeyOptions<TInput extends TTimeRange, TOutput, TKey> {
	getKey: (block: TInput) => TKey;
	mergeGroup: (blocks: TInput[]) => TOutput;
}

interface TMergeTinyGroupsWithNeighborsOptions<
	TGroup extends TTimeRange,
	TMerged extends TTimeRange
> {
	minWidthPx: number;
	getWidthPx: (block: TGroup | TMerged) => number;
	mergeBlocks: (blocks: Array<TGroup | TMerged>) => TMerged;
}

interface TMergeAdjacentBlocksByKeyOptions<TBlock, TKey> {
	getMergeKey: (block: TBlock) => TKey | undefined;
	mergeBlocks: (blocks: TBlock[]) => TBlock;
}

interface TTimeRange {
	startMs: number;
	endMs: number;
}
