const filenameMap = {
	'tick': 'timer-tick.mp3',
	'complete': 'timer-complete.mp3',
	'meow': 'cat-meow.mp3',
	'wind-up-tick-1': 'timer-wind-up-tick-1.mp3',
	'wind-up-tick-2': 'timer-wind-up-tick-2.mp3',
	'wind-up-tick-3': 'timer-wind-up-tick-3.mp3',
	'wind-up-tick-4': 'timer-wind-up-tick-4.mp3',
	'wind-up-tick-5': 'timer-wind-up-tick-5.mp3',
	'wind-up-tick-6': 'timer-wind-up-tick-6.mp3',
	'wind-up-tick-7': 'timer-wind-up-tick-7.mp3',
	'wind-up-tick-8': 'timer-wind-up-tick-8.mp3',
	'wind-up-tick-9': 'timer-wind-up-tick-9.mp3',
	'wind-up-tick-10': 'timer-wind-up-tick-10.mp3',
	'wind-up-tick-11': 'timer-wind-up-tick-11.mp3'
} as const;

export const audioConfig = {
	filenameMap,
	resolvePath(id: TSoundId): string {
		return `/audio/${this.filenameMap[id]}`;
	}
};

export type TSoundId = keyof typeof filenameMap;
