import { Button } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: Home,
	loader: async () => {
		return {
			message: 'Hello World'
		};
	}
});

function Home() {
	const { message } = Route.useLoaderData();

	return (
		<div className="bg-blue-200 p-2">
			<h3>{message}</h3>
			<Button />
		</div>
	);
}
