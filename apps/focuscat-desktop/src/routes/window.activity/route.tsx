import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router';
import React from 'react';
import { unwrapOrNull } from 'tuple-result';
import { ThemeProvider, WindowHeader } from '@/components';
import { specta } from '@/environment';
import { SettingsCxProvider } from '@/features/settings';
import { useOnSessionComplete } from '@/hooks';
import { toTuple } from '@/lib';
import { SessionList } from './components';
import { activitySessionConfig } from './config';

export const Route = createFileRoute('/window/activity')({
	loader: async () => {
		const { startedAfter, startedBefore } = activitySessionConfig.activitySessionTimeRange();
		return (
			unwrapOrNull(
				toTuple(
					await specta.commands.getSessions(
						startedAfter,
						startedBefore,
						activitySessionConfig.limit,
						activitySessionConfig.minDurationSecs
					)
				)
			) ?? []
		);
	},
	pendingComponent: LoadingComponent,
	component: LayoutComponent
});

function LayoutComponent() {
	const sessions = Route.useLoaderData();
	const router = useRouter();

	// MARK: - Effects

	useOnSessionComplete(React.useCallback(() => router.invalidate(), [router]));

	// MARK: - UI

	// Empty state - no sessions
	if (sessions.length === 0) {
		return (
			<SettingsCxProvider>
				<ThemeProvider>
					<div className="bg-base-0 flex h-screen flex-col">
						<WindowHeader title="Activity" />
						<div className="flex flex-1 items-center justify-center">
							<div className="text-center">
								<p className="text-base-600 text-sm font-medium">No sessions yet</p>
								<p className="text-base-400 mt-1 text-xs">
									Complete a focus session to see it here
								</p>
							</div>
						</div>
					</div>
				</ThemeProvider>
			</SettingsCxProvider>
		);
	}

	return (
		<SettingsCxProvider>
			<ThemeProvider>
				<div className="bg-base-0 flex h-screen flex-col">
					<WindowHeader title="Activity" />

					{/* Main Content */}
					<div className="flex flex-1 overflow-hidden">
						<SessionList sessions={sessions} className="border-base-200 w-56 shrink-0 border-r" />

						{/* Content */}
						<main className="bg-base-0 flex-1 overflow-y-auto p-4">
							<Outlet />
						</main>
					</div>
				</div>
			</ThemeProvider>
		</SettingsCxProvider>
	);
}

function LoadingComponent() {
	return (
		<div className="bg-base-0 flex h-screen items-center justify-center">
			<span className="text-base-400 text-sm">Loading sessions...</span>
		</div>
	);
}
