import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { WindowHeader } from '@/components';
import { Cat, catConfig, type TCatFace, type TCatHat, type TCatRef } from '@/features/cat';

export const Route = createFileRoute('/window/main/splash/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const catRef = React.useRef<TCatRef>(null);

	// Randomized accessories (picked once on mount)
	const face = React.useMemo<TCatFace>(() => {
		const faces = catConfig.parts.face.available;
		return faces[Math.floor(Math.random() * faces.length)] as TCatFace;
	}, []);
	const hat = React.useMemo<TCatHat | undefined>(() => {
		if (Math.random() < 0.5) return undefined;
		const hats = catConfig.parts.hat.available;
		return hats[Math.floor(Math.random() * hats.length)] as TCatHat;
	}, []);

	// MARK: - Effects

	// Tapping animation and transition timer
	React.useEffect(() => {
		const tapInterval = setInterval(() => {
			catRef.current?.tap();
		}, 250);

		const splashTimer = setTimeout(() => {
			void navigate({ to: '/window/main' });
		}, 2500);

		return () => {
			clearInterval(tapInterval);
			clearTimeout(splashTimer);
		};
	}, [navigate]);

	// MARK: - UI

	return (
		<div className="flex h-screen w-[300px] flex-col bg-[#267DF7]">
			<WindowHeader className="border-transparent bg-transparent" />
			<div className="flex flex-1 items-center justify-center">
				<Cat ref={catRef} size={150} face={face} hat={hat} />
			</div>
		</div>
	);
}
