import { catConfig } from './cat.config';
import type { TCatFace, TCatHat } from './types';

export function randomCat(): TRandomCat {
	const faces = catConfig.parts.face.available;
	const face = faces[Math.floor(Math.random() * faces.length)] as TCatFace;

	const hats = catConfig.parts.hat.available;
	const hat: TCatHat | undefined =
		Math.random() < 0.5 ? (hats[Math.floor(Math.random() * hats.length)] as TCatHat) : undefined;

	return { face, hat };
}

export interface TRandomCat {
	face: TCatFace;
	hat: TCatHat | undefined;
}
