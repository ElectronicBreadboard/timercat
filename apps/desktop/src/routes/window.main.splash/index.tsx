import { Cat, randomCat, type TCatRef } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { WindowHeader } from '@/components';

export const Route = createFileRoute('/window/main/splash/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const catRef = React.useRef<TCatRef>(null);
	const { face, hat } = React.useMemo(() => randomCat(), []);

	// MARK: - Effects

	// Tapping animation and transition timer
	React.useEffect(() => {
		const tapInterval = setInterval(() => {
			catRef.current?.tap();
		}, 250);

		const splashTimer = setTimeout(() => {
			void navigate({ to: '/window/main' });
		}, 2250); // 9 taps (9 lives)

		return () => {
			clearInterval(tapInterval);
			clearTimeout(splashTimer);
		};
	}, [navigate]);

	// MARK: - UI

	return (
		<div className="relative flex h-screen w-[300px] items-center justify-center bg-[#267DF7]">
			<WindowHeader
				showBadge={false}
				className="absolute top-0 right-0 left-0 border-transparent bg-transparent"
			/>
			<Cat ref={catRef} size={150} position="centered" face={face} hat={hat} />
		</div>
	);
}
