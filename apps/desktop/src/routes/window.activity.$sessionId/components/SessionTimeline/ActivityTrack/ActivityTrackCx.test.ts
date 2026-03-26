import { describe, expect, it } from 'vitest';
import { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import { ActivityTrackCx } from './ActivityTrackCx';
import type { TActivityBlock, TCategoryBlock } from './types';

describe('ActivityTrackCx', () => {
	describe('focus view mode', () => {
		it('should produce category blocks for focus mode', () => {
			// Prepare
			const activities = [
				createActivity({ startedAt: 0, endedAt: 200, category: 'focused' }),
				createActivity({ startedAt: 200, endedAt: 300, category: 'neutral' }),
				createActivity({ startedAt: 300, endedAt: 500, category: 'focused' })
			];

			// Act
			const blocks = createBlocks({ activities, viewMode: 'focus', width: 20 }).filter(
				isCategoryBlock
			);

			// Assert
			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toMatchObject({
				type: 'category',
				startMs: 0,
				endMs: 500,
				category: 'focused',
				categories: [
					{ category: 'focused', durationMs: 400 },
					{ category: 'neutral', durationMs: 100 }
				]
			});
		});

		it('should clip first and last focus blocks to the visible timeline bounds', () => {
			// Prepare
			const activities = [
				createActivity({ startedAt: 0, endedAt: 200, category: 'focused' }),
				createActivity({ startedAt: 800, endedAt: 1000, category: 'neutral' })
			];

			// Act
			const blocks = createBlocks({
				activities,
				viewMode: 'focus',
				startMs: 100,
				endMs: 900
			}).filter(isCategoryBlock);

			// Assert
			expect(blocks).toHaveLength(2);
			expect(blocks[0]?.startMs).toBe(100);
			expect(blocks[0]?.endMs).toBe(200);
			expect(blocks[1]?.startMs).toBe(800);
			expect(blocks[1]?.endMs).toBe(900);
		});
	});

	describe('apps view mode', () => {
		it('should produce window-group blocks for same-app activity', () => {
			// Prepare
			const activities = [
				createActivity({ startedAt: 0, endedAt: 100, appBundleId: 'app.a', appName: 'App A' }),
				createActivity({ startedAt: 100, endedAt: 300, appBundleId: 'app.a', appName: 'App A' })
			];

			// Act
			const blocks = createBlocks({ activities, viewMode: 'apps' });

			// Assert
			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toMatchObject({
				type: 'window-group',
				startMs: 0,
				endMs: 300,
				app: { bundleId: 'app.a', name: 'App A' }
			});

			if (blocks[0]?.type !== 'window-group') {
				throw new Error('Expected a window-group block');
			}

			expect(blocks[0].segments).toHaveLength(2);
		});

		it('should produce app blocks for merged mixed-app activity', () => {
			// Prepare
			const activities = [
				createActivity({ startedAt: 0, endedAt: 200, appBundleId: 'app.a', appName: 'App A' }),
				createActivity({ startedAt: 200, endedAt: 300, appBundleId: 'app.b', appName: 'App B' }),
				createActivity({ startedAt: 300, endedAt: 500, appBundleId: 'app.a', appName: 'App A' })
			];

			// Act
			const blocks = createBlocks({ activities, viewMode: 'apps', width: 20 });

			// Assert
			expect(blocks).toHaveLength(1);
			expect(blocks[0]).toMatchObject({
				type: 'app',
				startMs: 0,
				endMs: 500,
				apps: [
					{ bundleId: 'app.a', name: 'App A' },
					{ bundleId: 'app.b', name: 'App B' }
				]
			});
		});

		it('should clip first and last app blocks to the visible timeline bounds', () => {
			// Prepare
			const activities = [
				createActivity({ startedAt: 0, endedAt: 200, appBundleId: 'app.a', appName: 'App A' }),
				createActivity({ startedAt: 800, endedAt: 1000, appBundleId: 'app.b', appName: 'App B' })
			];

			// Act
			const blocks = createBlocks({
				activities,
				viewMode: 'apps',
				startMs: 100,
				endMs: 900
			});

			// Assert
			expect(blocks).toHaveLength(2);
			expect(blocks[0]?.startMs).toBe(100);
			expect(blocks[0]?.endMs).toBe(200);
			expect(blocks[1]?.startMs).toBe(800);
			expect(blocks[1]?.endMs).toBe(900);
		});
	});
});

function createBlocks(options: TCreateBlocksOptions): TActivityBlock[] {
	const { activities, viewMode, width = 1000, startMs = 0, endMs = 1000 } = options;

	const timelineCx = new TimelineCx(startMs, endMs);
	timelineCx.$containerRect.set({ width, left: 0 });

	const cx = new ActivityTrackCx(timelineCx, activities);
	cx.setViewMode(viewMode);

	const blocks = cx.$blocks.get();

	cx.unmount();
	timelineCx.unmount();

	return blocks;
}

function isCategoryBlock(block: TActivityBlock): block is TCategoryBlock {
	return block.type === 'category';
}

function createActivity(options: TCreateActivityOptions): specta.WindowActivityDto {
	const {
		appBundleId = 'app.bundle',
		appName = 'App',
		appIcon = null,
		appColor = '#3b82f6',
		websiteDomain = null,
		websiteName = null,
		websiteIcon = null,
		websiteColor = null,
		windowTitle = null,
		browserUrl = null,
		category = null,
		startedAt,
		endedAt
	} = options;

	return {
		appBundleId,
		appName,
		appIcon,
		appColor,
		websiteDomain,
		websiteName,
		websiteIcon,
		websiteColor,
		windowTitle,
		browserUrl,
		category,
		startedAt,
		endedAt
	};
}

interface TCreateBlocksOptions {
	activities: specta.WindowActivityDto[];
	viewMode: 'apps' | 'focus';
	width?: number;
	startMs?: number;
	endMs?: number;
}

interface TCreateActivityOptions {
	startedAt: number;
	endedAt: number;
	appBundleId?: string | null;
	appName?: string | null;
	appIcon?: string | null;
	appColor?: string | null;
	websiteDomain?: string | null;
	websiteName?: string | null;
	websiteIcon?: string | null;
	websiteColor?: string | null;
	windowTitle?: string | null;
	browserUrl?: string | null;
	category?: specta.WindowActivityDto['category'];
}
