import { randomCat } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { App } from '@/app';

export const Route = createFileRoute('/sites/pomodorocat/')({
	loader: () => {
		return {
			// Runs on the server so client hydration uses the same values (no SSR flash)
			splashCat: randomCat()
		};
	},
	head: () => ({
		meta: [
			{ title: 'Pomodoro Cat — Free Cat Pomodoro Timer' },
			{
				name: 'description',
				content:
					'A free cat-themed pomodoro timer with a cozy lofi aesthetic. Use the 25-minute Pomodoro Technique to stay focused, with your virtual cat companion by your side.'
			},
			{ property: 'og:title', content: 'Pomodoro Cat — Free Cat Pomodoro Timer' },
			{
				property: 'og:description',
				content:
					'A free cat-themed pomodoro timer. Stay focused with the Pomodoro Technique and your virtual cat companion.'
			},
			{ property: 'og:type', content: 'website' },
			{ name: 'twitter:card', content: 'summary' },
			{ name: 'twitter:title', content: 'Pomodoro Cat — Free Cat Pomodoro Timer' },
			{
				name: 'twitter:description',
				content:
					'A free cat-themed pomodoro timer. Stay focused with the Pomodoro Technique and your virtual cat companion.'
			}
		]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const { splashCat } = Route.useLoaderData();

	return (
		<div className="scrollbar-hide h-screen overflow-x-hidden overflow-y-auto">
			<App splashCat={splashCat} />

			<section className="border-base-200/70 text-base-800 mx-auto max-w-3xl space-y-10 border-t px-8 py-16">
				<div>
					<h2 className="text-base-900 text-2xl font-semibold">What is Pomodoro Cat?</h2>
					<p className="mt-4 leading-relaxed">
						Pomodoro Cat is a free, cat-themed pomodoro timer that runs in your browser. It pairs
						the proven Pomodoro Technique with a cozy lofi aesthetic and a virtual cat companion —
						making it easier and more enjoyable to get into deep work. No account, no setup. Just
						open the page and start your first session.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-2xl font-semibold">How the Pomodoro Technique Works</h2>
					<p className="mt-4 leading-relaxed">
						The Pomodoro Technique is a time management method developed by Francesco Cirillo in the
						late 1980s. Work in focused 25-minute blocks, take a 5-minute break, then repeat. After
						four sessions, take a longer 15–30 minute rest. Breaking work into smaller, timed chunks
						reduces mental fatigue, fights procrastination, and keeps you productive throughout the
						day.
					</p>
				</div>

				<div>
					<h2 className="text-base-900 text-2xl font-semibold">Why a Cat Pomodoro Timer?</h2>
					<p className="mt-4 leading-relaxed">
						Research shows that looking at cute imagery can sharpen focus and attention to detail —
						the so-called "kawaii effect." Your virtual cat companion gives you a low-pressure form
						of accountability and a reason to keep sessions going. The lofi background keeps your
						workspace calm and distraction-free, so your energy goes to the work, not the
						environment.
					</p>
				</div>

				<div>
					<h3 className="text-base-900 text-lg font-semibold">From the blog</h3>
					<ul className="mt-3 space-y-2">
						<li>
							<a
								href="/blog/what-is-pomodoro-technique"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								What is the Pomodoro Technique? A Complete Guide
							</a>
						</li>
						<li>
							<a
								href="/blog/pomodoro-cat-timer"
								className="text-base-600 hover:text-base-950 underline underline-offset-2"
							>
								Why a Cat Pomodoro Timer Helps You Focus
							</a>
						</li>
					</ul>
				</div>
			</section>
		</div>
	);
}
