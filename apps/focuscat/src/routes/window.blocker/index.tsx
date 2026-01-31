import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
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

	return <pre style={{ padding: 16, fontSize: 12 }}>{JSON.stringify(violation, null, 2)}</pre>;
}
