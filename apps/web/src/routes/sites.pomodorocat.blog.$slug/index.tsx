import { MDXContent } from '@content-collections/mdx/react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { allPomodorocatBlogs } from 'content-collections';
import React from 'react';

export const Route = createFileRoute('/sites/pomodorocat/blog/$slug/')({
	loader: ({ params }) => {
		const post = allPomodorocatBlogs.find((p) => p._meta.path === params.slug);
		if (!post) {
			throw notFound();
		}
		return { post };
	},
	head: ({ loaderData }) => ({
		meta: [
			{ title: `${loaderData?.post.title ?? 'Blog'} — Pomodoro Cat` },
			{ name: 'description', content: loaderData?.post.summary ?? '' },
			{ property: 'og:title', content: `${loaderData?.post.title ?? 'Blog'} — Pomodoro Cat` },
			{ property: 'og:description', content: loaderData?.post.summary ?? '' }
		]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const { post } = Route.useLoaderData();

	return (
		<>
			<Header />

			<article className="prose dark:prose-invert prose-base mx-auto max-w-2xl px-6 py-12">
				<p className="not-prose text-base-400 mb-2 text-xs">{post.published}</p>
				<MDXContent code={post.mdx} />
			</article>

			<footer className="border-base-100 border-t px-6 py-10 text-center">
				<p className="text-base-500 mb-3 text-sm">Ready to try it?</p>
				<a
					href="/"
					className="bg-base-950 text-base-0 hover:bg-base-800 inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
				>
					Open Pomodoro Cat — free in your browser
				</a>
			</footer>
		</>
	);
}

const Header: React.FC = () => {
	return (
		<header className="border-base-100 flex items-center justify-between border-b px-6 py-4">
			<a href="/" className="text-base-950 hover:text-base-600 font-semibold transition-colors">
				🐱 Pomodoro Cat
			</a>
			<a href="/blog" className="text-base-400 hover:text-base-950 text-sm transition-colors">
				← All posts
			</a>
		</header>
	);
};
