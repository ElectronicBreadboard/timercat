import { withLocalStorage } from 'feature-react/state';
import { createState } from 'feature-state';
import { TimelineCx } from '@/components';
import type { specta } from '@/environment';
import { ActivityRowCx } from './ActivityRow';

export class SessionTimelineCx {
	public readonly timelineCx: TimelineCx;
	public readonly activityRowCx: ActivityRowCx;
	public readonly $granularity;
	public readonly config: TSessionTimelineCxConfig;

	private _unlisteners: Array<() => void> = [];

	constructor(
		session: specta.SessionDetailDto,
		activities: specta.WindowActivityDto[],
		options: TSessionTimelineCxOptions = {}
	) {
		const {
			storageKey = 'focuscat:timeline-granularity',
			granularityMin = 0,
			granularityMax = 5,
			granularityDefault = 3
		} = options;

		this.timelineCx = new TimelineCx(session.startedAt, session.endedAt ?? Date.now());
		this.config = { storageKey, granularityMin, granularityMax, granularityDefault };
		this.$granularity = withLocalStorage(createState(granularityDefault), storageKey);

		const { minWindowBlockPx, minAppBlockPx } = this.granularityToConfig(this.$granularity.get());
		this.activityRowCx = new ActivityRowCx(this.timelineCx, activities, {
			minWindowBlockPx,
			minAppBlockPx
		});

		this._unlisteners.push(
			this.$granularity.listen(({ value }) => {
				const config = this.granularityToConfig(value);
				this.activityRowCx.setConfig(config);
			})
		);
	}

	public unmount(): void {
		for (const unlisten of this._unlisteners) {
			unlisten();
		}
		this._unlisteners = [];
		this.activityRowCx.unmount();
	}

	public setGranularity(granularity: number): void {
		this.$granularity.set(granularity);
	}

	public setActivities(activities: specta.WindowActivityDto[]): void {
		this.activityRowCx.setActivities(activities);
	}

	// Higher granularity = smaller min sizes = more detail
	private granularityToConfig(granularity: number): {
		minWindowBlockPx: number;
		minAppBlockPx: number;
	} {
		return {
			minWindowBlockPx: (this.config.granularityMax - granularity) * 4,
			minAppBlockPx: (this.config.granularityMax - granularity) * 6
		};
	}
}

export interface TSessionTimelineCxOptions {
	storageKey?: string;
	granularityMin?: number;
	granularityMax?: number;
	granularityDefault?: number;
}

export type TSessionTimelineCxConfig = Required<TSessionTimelineCxOptions>;
