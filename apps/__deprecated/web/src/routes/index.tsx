import { Button, ButtonLink } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	component: Home,
	loader: async () => {
		return {
			message: 'Isshin'
		};
	}
});

function Home() {
	return (
		<div className="bg-base-50 flex min-h-screen flex-col items-center justify-center gap-12 p-8 text-center">
			<div className="flex flex-col gap-4">
				<h1 className="text-primary font-serif text-6xl font-bold tracking-[0.2em] uppercase">
					Isshin
				</h1>
				<p className="text-base-content/60 font-sans text-lg tracking-wide">One Mind. One Focus.</p>
			</div>

			<div className="flex flex-col items-center gap-6">
				<div className="flex gap-6">
					<Button variant="primary" className="min-w-[140px]">
						Join Waitlist
					</Button>
					<ButtonLink
						variant="neutral"
						className="min-w-[140px]"
						href="https://github.com/builder-group/isshin"
					>
						Github
					</ButtonLink>
				</div>
			</div>
		</div>
	);
}
