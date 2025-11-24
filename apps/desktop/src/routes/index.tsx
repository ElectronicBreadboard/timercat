import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: Home
});

function Home() {
	return (
		<div className="bg-blue-200 p-2">
			<h3>Welcome Home!!!</h3>
		</div>
	);
}
