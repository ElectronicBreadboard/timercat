import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/window/activity/')({
	loader: () => {
		throw redirect({ to: '/window/activity/overview' });
	}
});
