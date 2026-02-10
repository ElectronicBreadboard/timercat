export const activitySessionConfig = {
	// Consider sessions from the last 30 days, excluding very short sessions (< 30s)
	daysBack: 30,
	limit: 100,
	minDurationSecs: 30,

	activitySessionTimeRange: (now: number = Date.now()) => {
		const startedBefore = now;
		const startedAfter = now - activitySessionConfig.daysBack * 24 * 60 * 60 * 1000;
		return { startedAfter, startedBefore };
	}
} as const;
