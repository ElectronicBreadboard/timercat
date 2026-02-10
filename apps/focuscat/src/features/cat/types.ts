export type TCatFur = 'white';

export type TCatHat = 'banana' | 'lil-duck' | 'propeller-hat' | 'heart';

export type TCatFace = 'asia' | 'cute' | 'dead' | 'harry-potter' | 'pilot' | 'pixel-cool';

export type TCatHand = 'down' | 'up';

export interface TCat {
	fur: TCatFur;
	hat?: TCatHat;
	face: TCatFace;
	leftHand: TCatHand;
	rightHand: TCatHand;
}
