import { TCatFace, TCatFur, TCatHand, TCatHat } from './types';

export const catConfig = {
	// Base size of the cat asset (width and height, since it's square)
	baseSize: 248,
	// Base bottom offset of the body from the bottom of the image (in pixels at base size)
	baseBodyBottomOffset: 83,
	// Minimum time between taps (prevents rapid tapping e.g. when dragging timer wheel)
	tapThrottleMs: 200,
	parts: {
		fur: {
			available: ['white'] as const,
			path: {
				base: (fur: TCatFur) => getCatPath('fur', `${fur}_base`),
				leftHand: (fur: TCatFur, hand: TCatHand) => getCatPath('fur', `${fur}_left-${hand}`),
				rightHand: (fur: TCatFur, hand: TCatHand) => getCatPath('fur', `${fur}_right-${hand}`)
			}
		},
		hat: {
			available: ['banana', 'lil-duck', 'propeller-hat', 'heart', 'timer', 'crown'] as const,
			path: (hat: TCatHat) => getCatPath('hat', hat)
		},
		face: {
			available: ['asia', 'cute', 'dead', 'harry-potter', 'nerd', 'pilot', 'pixel-cool'] as const,
			path: (face: TCatFace) => getCatPath('face', face)
		},
		hand: {
			available: ['down', 'up'] as const
		}
	}
};

function getCatPath(category: string, name: string): string {
	return `/illustrations/cat/${category}/${category}_${name}.svg`;
}
