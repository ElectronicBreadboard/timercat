import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sites/pomodorocat/robots.txt')({
	server: {
		handlers: {
			GET: async () => {
				const body = `User-agent: *
Allow: /

Sitemap: https://pomodorocat.com/sitemap.xml
`;
				return new Response(body, {
					headers: { 'Content-Type': 'text/plain' }
				});
			}
		}
	}
});
