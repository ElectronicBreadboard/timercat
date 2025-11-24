import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import React from 'react';
import styles from '../styles.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: 'utf-8'
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1'
			}
		],
		links: [{ rel: 'stylesheet', href: styles }]
	}),
	shellComponent: RootDocument
});

function RootDocument(props: { children: React.ReactNode }) {
	const { children } = props;

	return (
		<html>
			<head>
				<HeadContent />
			</head>
			<body>
				<div className="flex gap-2 p-2 text-lg">
					<Link
						to="/"
						activeProps={{
							className: 'font-bold'
						}}
						activeOptions={{ exact: true }}
					>
						Home
					</Link>
					<Link
						to="/settings"
						activeProps={{
							className: 'font-bold'
						}}
					>
						Settings
					</Link>
				</div>
				<hr />
				{children}
				<TanStackRouterDevtools position="bottom-right" />
				<Scripts />
			</body>
		</html>
	);
}
