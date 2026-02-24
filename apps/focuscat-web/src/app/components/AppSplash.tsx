import { Cat, type TCatRef, type TRandomCat } from '@repo/ui';
import { motion } from 'motion/react';
import React from 'react';

export const AppSplash: React.FC<TAppSplashProps> = (props) => {
	const { cat, onComplete } = props;
	const catRef = React.useRef<TCatRef>(null);

	React.useEffect(() => {
		const tapInterval = setInterval(() => {
			catRef.current?.tap();
		}, 250);

		const splashTimer = setTimeout(onComplete, 1250);

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
			<Cat ref={catRef} size={150} position="centered" face={cat.face} hat={cat.hat} />
		</motion.div>
	);
};

interface TAppSplashProps {
	cat: TRandomCat;
	onComplete: () => void;
}
