import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/window/settings/')({
	beforeLoad: () => {
		throw redirect({ to: '/window/settings/app' });
	},
	component: () => null
});
