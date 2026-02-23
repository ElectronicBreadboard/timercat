import { createFileRoute } from '@tanstack/react-router';
import { allPomodorocatBlogs } from 'content-collections';
import React from 'react';

export const Route = createFileRoute('/sites/pomodorocat/blog/')({
	loader: () =>
		[...allPomodorocatBlogs].sort(
			(a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
		),
	head: () => ({
		meta: [
			{ title: 'Blog — Pomodoro Cat' },
			{
				name: 'description',
				content:
					'Guides and articles about the Pomodoro Technique, staying focused, and getting the most out of Pomodoro Cat.'
			}
		]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const posts = Route.useLoaderData();

	return (
		<div className="bg-base-0 text-base-950 min-h-screen font-sans">
			<Header />

			<main className="mx-auto max-w-2xl px-6 py-12">
				<h1 className="mb-10 text-3xl font-semibold tracking-tight">Blog</h1>

				<div className="space-y-8">
					{posts.map((post) => (
						<article key={post._meta.path}>
							<a href={`/blog/${post._meta.path}`} className="group block">
								<p className="text-base-400 mb-1 text-xs">{post.published}</p>
								<h2 className="group-hover:text-primary text-lg font-semibold transition-colors">
									{post.title}
								</h2>
								<p className="text-base-500 mt-1 text-sm leading-relaxed">{post.summary}</p>
								<span className="text-primary mt-2 inline-block text-xs">Read →</span>
							</a>
						</article>
					))}
				</div>
			</main>

			<footer className="border-base-100 border-t px-6 py-10 text-center">
				<a
					href="/"
					className="bg-base-950 text-base-0 hover:bg-base-800 inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
				>
					← Open the Timer
				</a>
			</footer>
		</div>
	);
}

const Header: React.FC = () => {
	return (
		<header className="border-base-100 flex items-center justify-between border-b px-6 py-4">
			<span className="text-base-950 font-semibold">🐱 Pomodoro Cat</span>
			<a href="/" className="text-base-400 hover:text-base-950 text-sm transition-colors">
				Open Timer →
			</a>
		</header>
	);
};
