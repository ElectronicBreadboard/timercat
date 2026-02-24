import { Cat, catConfig, type TCatFace, type TCatHat, type TCatRef } from '@repo/ui';
import { motion } from 'motion/react';
import React from 'react';

export const AppSplash: React.FC<TAppSplashProps> = (props) => {
	const { onComplete } = props;
	const catRef = React.useRef<TCatRef>(null);

	const face = React.useMemo<TCatFace>(() => {
		const faces = catConfig.parts.face.available;
		return faces[Math.floor(Math.random() * faces.length)] as TCatFace;
	}, []);
	const hat = React.useMemo<TCatHat | undefined>(() => {
		if (Math.random() < 0.5) return undefined;
		const hats = catConfig.parts.hat.available;
		return hats[Math.floor(Math.random() * hats.length)] as TCatHat;
	}, []);

	React.useEffect(() => {
		const tapInterval = setInterval(() => {
			catRef.current?.tap();
		}, 250);

		const splashTimer = setTimeout(onComplete, 2250);

		return () => {
			clearInterval(tapInterval);
			clearTimeout(splashTimer);
		};
	}, [onComplete]);

	return (
		<motion.div
			className="absolute inset-0 z-50 flex items-center justify-center bg-[#267DF7]"
			exit={{ opacity: 0, scale: 1.03 }}
			transition={{ duration: 0.3, ease: 'easeIn' }}
		>
			<Cat ref={catRef} size={150} position="centered" face={face} hat={hat} />
		</motion.div>
	);
};

interface TAppSplashProps {
	onComplete: () => void;
}
