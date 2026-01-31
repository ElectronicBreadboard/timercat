import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { Badge, WindowHeader } from '@/components';
import { specta } from '@/environment';
import { Cat, catConfig, type TCatFace, type TCatHat } from '@/features/cat';
import { hexToRgba } from '@/lib';

export const Route = createFileRoute('/window/blocker/')({
	component: RouteComponent
});

function RouteComponent() {
	const [violation, setViolation] = React.useState<specta.BlockingViolationDto | null>(null);

	// Randomized cat (picked once on mount)
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

	// Fetch violation on mount (event may have fired before listener was ready),
	// then listen for updates via event.
	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		(async () => {
			const v = await specta.commands.getBlockingViolation();
			setViolation(v ?? null);

			unlisten = await specta.events.blockingViolationEvent.listen((event) => {
				setViolation(event.payload);
			});
		})();

		return () => {
			unlisten?.();
		};
	}, []);

	// MARK: - UI

	const profileColor = violation?.profileColor ?? '#9CA3AF';

	return (
		<div className="bg-base-0 flex h-screen flex-col">
			<WindowHeader title="Blocked" showBadge={false} />
			<div className="flex flex-1 flex-col items-center justify-center p-6">
				{violation != null ? (
					<div className="flex flex-col items-center gap-1">
						<Cat face={face} hat={hat} />
						<p className="text-base-900 text-lg font-semibold">
							{describeTarget(violation.blockedTarget)}
						</p>
						<p className="text-base-500 text-sm">
							Blocked by{' '}
							<Badge
								style={{
									backgroundColor: hexToRgba(profileColor, 0.1),
									color: profileColor
								}}
							>
								{violation.profileName}
							</Badge>
						</p>
					</div>
				) : (
					<Cat face={face} hat={hat} position="centered" />
				)}
			</div>
		</div>
	);
}

function describeTarget(target: specta.BlockedTargetDto): string {
	switch (target.type) {
		case 'website':
			return `${target.domain} is blocked`;
		case 'app':
			return 'This app is blocked';
	}
}
