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

	public readonly pausePeriods: TTimePeriod[];
	public readonly overtimePeriods: TTimePeriod[];
	public readonly cancelledPeriod: TTimePeriod | null;
	public readonly eventMarkers: TEventMarker[];

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

		this.config = { storageKey, granularityMin, granularityMax, granularityDefault };
		this.$granularity = withLocalStorage(createState(granularityDefault), storageKey);

		const actualEndMs = session.endedAt ?? Date.now();
		const plannedRunningMs = session.plannedSeconds * 1000;

		// 1. Compute pause periods (needed for wall clock calculations)
		this.pausePeriods = this.computePausePeriods(session.events, actualEndMs);

		// 2. Compute total extended time
		const totalExtendedMs = session.events
			.filter((e) => e.eventType === 'extended' && e.data?.seconds != null)
			.reduce((sum, e) => sum + (e.data?.seconds ?? 0) * 1000, 0);

		// 3. Compute effective planned end (when timer would hit 0, accounting for pauses)
		const effectivePlannedEndMs = this.computeWallClockForRunningTime(
			session.startedAt,
			plannedRunningMs + totalExtendedMs
		);

		// 4. Timeline extends to whichever is later: planned end or actual end
		const timelineEndMs = Math.max(effectivePlannedEndMs, actualEndMs);
		this.timelineCx = new TimelineCx(session.startedAt, timelineEndMs);

		// 5. Compute overtime periods (gaps between timer hitting 0 and extending)
		this.overtimePeriods = this.computeOvertimePeriods(
			session.startedAt,
			session.events,
			plannedRunningMs,
			actualEndMs
		);

		// 6. Compute cancelled period (if quit early)
		this.cancelledPeriod =
			session.status === 'cancelled' && actualEndMs < effectivePlannedEndMs
				? { startMs: actualEndMs, endMs: effectivePlannedEndMs }
				: null;

		// 7. Compute event markers
		this.eventMarkers = this.computeEventMarkers(session.events);

		// 8. Setup activity row
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

	private granularityToConfig(granularity: number): {
		minWindowBlockPx: number;
		minAppBlockPx: number;
	} {
		return {
			minWindowBlockPx: (this.config.granularityMax - granularity) * 4,
			minAppBlockPx: (this.config.granularityMax - granularity) * 6
		};
	}

	private computeWallClockForRunningTime(startedAt: number, targetRunningMs: number): number {
		const sortedPauses = [...this.pausePeriods].sort((a, b) => a.startMs - b.startMs);

		let runningTime = 0;
		let wallClock = startedAt;

		for (const pause of sortedPauses) {
			const segmentMs = pause.startMs - wallClock;

			if (runningTime + segmentMs >= targetRunningMs) {
				return wallClock + (targetRunningMs - runningTime);
			}

			runningTime += segmentMs;
			wallClock = pause.endMs;
		}

		return wallClock + (targetRunningMs - runningTime);
	}

	private computePausePeriods(
		events: specta.SessionEventDto[],
		sessionEndMs: number
	): TTimePeriod[] {
		const periods: TTimePeriod[] = [];
		let pauseStartMs: number | null = null;

		for (const event of events) {
			if (event.eventType === 'paused') {
				pauseStartMs = event.timestamp;
			} else if (event.eventType === 'resumed' && pauseStartMs != null) {
				periods.push({ startMs: pauseStartMs, endMs: event.timestamp });
				pauseStartMs = null;
			}
		}

		if (pauseStartMs != null) {
			periods.push({ startMs: pauseStartMs, endMs: sessionEndMs });
		}

		return periods;
	}

	private computeOvertimePeriods(
		startedAt: number,
		events: specta.SessionEventDto[],
		plannedRunningMs: number,
		actualEndMs: number
	): TTimePeriod[] {
		const periods: TTimePeriod[] = [];

		const extensions = events
			.filter((e) => e.eventType === 'extended' && e.data?.seconds != null)
			.sort((a, b) => a.timestamp - b.timestamp);

		let currentPlannedRunningMs = plannedRunningMs;

		for (const ext of extensions) {
			const timerEndWallClock = this.computeWallClockForRunningTime(
				startedAt,
				currentPlannedRunningMs
			);

			if (ext.timestamp > timerEndWallClock) {
				periods.push({ startMs: timerEndWallClock, endMs: ext.timestamp });
			}

			currentPlannedRunningMs += (ext.data?.seconds ?? 0) * 1000;
		}

		const finalTimerEndWallClock = this.computeWallClockForRunningTime(
			startedAt,
			currentPlannedRunningMs
		);

		if (actualEndMs > finalTimerEndWallClock) {
			periods.push({ startMs: finalTimerEndWallClock, endMs: actualEndMs });
		}

		return periods;
	}

	private computeEventMarkers(events: specta.SessionEventDto[]): TEventMarker[] {
		const markers: TEventMarker[] = [];

		// Filter to key events only
		const keyEventTypes = ['paused', 'resumed', 'extended'];
		const keyEvents = events.filter((e) => keyEventTypes.includes(e.eventType));

		for (let i = 0; i < keyEvents.length; i++) {
			const event = keyEvents[i]!;
			const prevEvent = keyEvents[i - 1];
			const nextEvent = keyEvents[i + 1];

			// Filter out pause/resume that are part of the extend UX flow:
			// - paused followed by extended → filter out (pause before drag)
			// - resumed preceded by extended → filter out (resume after drag)
			if (event.eventType === 'paused' && nextEvent?.eventType === 'extended') {
				continue;
			}
			if (event.eventType === 'resumed' && prevEvent?.eventType === 'extended') {
				continue;
			}

			markers.push({
				timestamp: event.timestamp,
				eventType: event.eventType as 'paused' | 'resumed' | 'extended',
				data: event.data
			});
		}

		for (const period of this.overtimePeriods) {
			const durationSeconds = Math.round((period.endMs - period.startMs) / 1000);
			markers.push({
				timestamp: period.startMs,
				eventType: 'overtime',
				data: { seconds: durationSeconds }
			});
		}

		if (this.cancelledPeriod != null) {
			markers.push({
				timestamp: this.cancelledPeriod.startMs,
				eventType: 'cancelled',
				data: null
			});
		}

		return markers.sort((a, b) => a.timestamp - b.timestamp);
	}
}

export interface TSessionTimelineCxOptions {
	storageKey?: string;
	granularityMin?: number;
	granularityMax?: number;
	granularityDefault?: number;
}

export type TSessionTimelineCxConfig = Required<TSessionTimelineCxOptions>;

export interface TTimePeriod {
	startMs: number;
	endMs: number;
}

export interface TEventMarker {
	timestamp: number;
	eventType: 'paused' | 'resumed' | 'extended' | 'cancelled' | 'overtime';
	data: { seconds: number | null } | null;
}
