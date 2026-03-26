import { describe, expect, it } from 'vitest';
import {
	groupConsecutiveByKey,
	mergeAdjacentBlocksByKey,
	mergeTinyGroupsWithNeighbors,
	mergeTinyRunsByKey
} from './aggregation';

describe('aggregation helpers', () => {
	describe('mergeTinyRunsByKey', () => {
		it('should merge tiny runs backward when the previous run has the same key', () => {
			// Prepare
			const blocks = [createBlock('a', 0, 40), createBlock('a', 40, 50), createBlock('b', 50, 90)];

			// Act
			const result = mergeTinyRunsByKey(blocks, {
				minWidthPx: 20,
				getKey: (block) => block.key,
				msToPx: (ms) => ms,
				mergeBlocks: (items) => mergeBlocks(items)
			});

			// Assert
			expect(result).toEqual([createBlock('a', 0, 50), createBlock('b', 50, 90)]);
		});
	});

	describe('groupConsecutiveByKey', () => {
		it('should group adjacent blocks with the same key', () => {
			// Prepare
			const blocks = [createBlock('a', 0, 10), createBlock('a', 10, 20), createBlock('b', 20, 30)];

			// Act
			const result = groupConsecutiveByKey(blocks, {
				getKey: (block) => block.key,
				mergeGroup: (items) => mergeBlocks(items)
			});

			// Assert
			expect(result).toEqual([createBlock('a', 0, 20), createBlock('b', 20, 30)]);
		});
	});

	describe('mergeTinyGroupsWithNeighbors', () => {
		it('should merge tiny groups with the smaller neighbor', () => {
			// Prepare
			const groups = [createBlock('a', 0, 40), createBlock('b', 40, 45), createBlock('c', 45, 60)];

			// Act
			const result = mergeTinyGroupsWithNeighbors<TBlock, TBlock>(groups, {
				minWidthPx: 10,
				getWidthPx: (block) => block.endMs - block.startMs,
				mergeBlocks: (items) => mergeBlocks(items)
			});

			// Assert
			expect(result).toEqual([createBlock('a', 0, 40), createBlock('b', 40, 60)]);
		});
	});

	describe('mergeAdjacentBlocksByKey', () => {
		it('should merge adjacent blocks with the same key', () => {
			// Prepare
			const blocks = [createBlock('a', 0, 10), createBlock('a', 10, 20), createBlock('b', 20, 30)];

			// Act
			const result = mergeAdjacentBlocksByKey(blocks, {
				getMergeKey: (block) => block.key,
				mergeBlocks: (items) => mergeBlocks(items)
			});

			// Assert
			expect(result).toEqual([createBlock('a', 0, 20), createBlock('b', 20, 30)]);
		});

		it('should merge adjacent blocks when the merge key is null', () => {
			// Prepare
			const blocks = [
				createNullableBlock(null, 0, 10),
				createNullableBlock(null, 10, 20),
				createNullableBlock('b', 20, 30)
			];

			// Act
			const result = mergeAdjacentBlocksByKey(blocks, {
				getMergeKey: (block) => block.key,
				mergeBlocks: (items) => mergeNullableBlocks(items)
			});

			// Assert
			expect(result).toEqual([createNullableBlock(null, 0, 20), createNullableBlock('b', 20, 30)]);
		});

		it('should skip blocks whose merge key is undefined', () => {
			// Prepare
			const blocks = [
				createNullableBlock('a', 0, 10),
				createNullableBlock(undefined, 10, 20),
				createNullableBlock('a', 20, 30)
			];

			// Act
			const result = mergeAdjacentBlocksByKey(blocks, {
				getMergeKey: (block) => block.key,
				mergeBlocks: (items) => mergeNullableBlocks(items)
			});

			// Assert
			expect(result).toEqual(blocks);
		});
	});
});

function mergeBlocks(blocks: TBlock[]): TBlock {
	const first = blocks[0];
	const last = blocks[blocks.length - 1];

	if (first == null || last == null) {
		throw new Error('Cannot merge empty blocks');
	}

	return createBlock(first.key, first.startMs, last.endMs);
}

function mergeNullableBlocks(blocks: TNullableBlock[]): TNullableBlock {
	const first = blocks[0];
	const last = blocks[blocks.length - 1];

	if (first == null || last == null) {
		throw new Error('Cannot merge empty blocks');
	}

	return createNullableBlock(first.key, first.startMs, last.endMs);
}

function createBlock(key: string, startMs: number, endMs: number): TBlock {
	return { key, startMs, endMs };
}

function createNullableBlock(
	key: string | null | undefined,
	startMs: number,
	endMs: number
): TNullableBlock {
	return { key, startMs, endMs };
}

interface TBlock {
	key: string;
	startMs: number;
	endMs: number;
}

interface TNullableBlock {
	key: string | null | undefined;
	startMs: number;
	endMs: number;
}
