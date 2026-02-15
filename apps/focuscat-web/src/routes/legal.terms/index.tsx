import { createFileRoute } from '@tanstack/react-router';
import { mdxComponents } from '@/components';
import Content from './content.mdx';

export const Route = createFileRoute('/legal/terms/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<article className="prose prose-base mx-auto max-w-3xl p-8">
			<Content components={mdxComponents} />
		</article>
	);
}
