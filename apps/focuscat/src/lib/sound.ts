const sounds = {
	tick: '/audio/pixabay/timer-tick.mp3',
	complete: '/audio/pixabay/timer-complete.mp3',
	meow: '/audio/pixabay/cat-meow.mp3'
} as const;

export type TSoundId = keyof typeof sounds;

export function playSound(id: TSoundId): void {
	const audio = new Audio(sounds[id]);
	audio.volume = 0.6;
	audio.play().catch(() => {}); // Ignore autoplay errors
}
