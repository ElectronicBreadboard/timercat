import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';

export const Route = createFileRoute('/window/blocker/')({
	component: RouteComponent
});

function RouteComponent() {
	const [violation, setViolation] = React.useState<specta.BlockingViolationDto | null>(null);

	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		// Fetch initial violation (event may have fired before listener was ready)
		specta.commands.getBlockingViolation().then((v) => {
			setViolation(v ?? null);
		});

		specta.events.blockingViolationEvent
			.listen((event) => {
				setViolation(event.payload ?? null);
			})
			.then((fn) => {
				unlisten = fn;
			});

		return () => unlisten?.();
	}, []);

	return (
		<div className="bg-base-0 flex h-screen flex-col">
			<WindowHeader title="Blocked" showBadge={false} />
			<div className="flex flex-1 flex-col items-center justify-center p-6">
				{violation != null && (
					<>
						<p className="text-base-900 text-lg font-semibold">
							{describeTarget(violation.blockedTarget)}
						</p>
						<p className="text-base-500 mt-1 text-sm">
							Blocked by{' '}
							<span className="text-base-700 font-medium">{violation.profileName}</span>
						</p>
					</>
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
