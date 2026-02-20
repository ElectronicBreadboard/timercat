import { SketchArrowIcon } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { AppCxProvider, MainWindow } from '@/app';
import { AppleIcon, GithubIcon, SimpleLogoIcon } from '@/components';
import { appConfig } from '@/environment';
import { useDetectPlatform } from '@/hooks';
import { fetchLatestRelease } from '@/lib';

export const Route = createFileRoute('/')({
	loader: () => fetchLatestRelease(),
	component: RouteComponent
});

function RouteComponent() {
	const { downloadLinks } = Route.useLoaderData();
	const { github, githubReleases } = appConfig.distribution;

	const { platform, isIntel } = useDetectPlatform();
	const downloadUrl = React.useMemo(() => {
		if (platform !== 'macos') {
			return null;
		}
		return isIntel ? downloadLinks.macIntel : downloadLinks.macArm;
	}, [platform, isIntel, downloadLinks]);

	const tags = React.useMemo(
		() => [
			'Offline-first',
			'Pomodoro',
			'Activity',
			'Focus profiles',
			'Privacy-first',
			'Open source',
			'Cat companion'
		],
		[]
	);

	// MARK: - UI

	return (
		<div className="text-base-950 flex min-h-screen flex-col items-center">
			<main className="flex w-full flex-col items-center px-8 pt-24 pb-9 sm:pt-28">
				<div className="animate-fade-in flex w-full max-w-3xl flex-col items-center text-center opacity-0">
					<img
						src="/logo.svg"
						alt="FocusCat app icon"
						className="border-base-200 mb-3 size-24 rounded-3xl border shadow-xl"
					/>
					<div className="animate-float relative mb-8 inline-flex flex-col items-center">
						<div className="bg-base-900 z-10 -mb-2 size-3 rotate-45 rounded-[2px]" />
						<div className="bg-base-900 text-base-0 rounded-full px-4 py-1 text-sm font-medium">
							FocusCat
						</div>
					</div>
					<h1 className="xs:text-5xl mb-8 font-serif text-4xl md:text-6xl">
						Focus timer with a cat <br className="hidden sm:block" />
						companion for <AppleIcon className="xs:size-10 mb-5 inline-block size-8 md:size-12" />
					</h1>
					<div className="mb-16 flex flex-col items-center gap-2 sm:mb-20">
						<div className="flex flex-wrap items-center justify-center gap-3">
							<a
								href={downloadUrl ?? githubReleases}
								{...(downloadUrl != null ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
								className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-medium transition-opacity ${
									downloadUrl != null
										? 'bg-base-950 text-base-0 hover:opacity-90'
										: 'bg-base-200 text-base-400 cursor-not-allowed'
								}`}
							>
								<AppleIcon className="size-5" />
								{downloadUrl != null ? 'Download for Mac' : 'macOS only'}
							</a>
							<a
								href={github}
								target="_blank"
								rel="noopener noreferrer"
								className="border-base-200 bg-base-0 inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-base font-medium transition-opacity hover:opacity-90"
							>
								<GithubIcon className="size-5" />
								View on GitHub
							</a>
						</div>
						<a
							href={githubReleases}
							target="_blank"
							rel="noopener noreferrer"
							className="text-base-600 mt-4 text-sm underline transition-opacity hover:opacity-80"
						>
							More download options
						</a>
					</div>
				</div>

				<div className="animate-fade-in-delay relative flex justify-center px-4 pt-24 opacity-0 sm:px-6 sm:pt-8">
					<div className="absolute right-0 bottom-130 flex flex-col items-center justify-center gap-2 text-[#525866] sm:-right-16 sm:bottom-120">
						<p className="font-handwritten text-center text-2xl font-bold">Try yourself</p>
						<SketchArrowIcon className="h-12 w-12 scale-x-[-1] rotate-180" />
					</div>
					<AppDemo />
				</div>

				<div className="animate-fade-in-delay mt-16 flex w-full max-w-[840px] flex-col px-8 text-left opacity-0 sm:mt-20 sm:text-center">
					<div className="mb-12 flex flex-col gap-4 font-serif text-3xl leading-tight tracking-[-0.008em] sm:mb-14 sm:text-4xl">
						<p>
							FocusCat is an offline-first focus timer for Mac. It helps you stay productive with
							pomodoro sessions, activity tracking, and app blocking.
						</p>
						<p>No accounts or subscriptions. Plus, it's lightweight and open source.</p>
					</div>
					<div className="mb-16 flex flex-wrap justify-center gap-2 sm:mb-24 sm:gap-2.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="border-base-200 bg-base-50 text-base-700 rounded-full border px-3.5 py-1.5 text-sm"
							>
								{tag}
							</span>
						))}
					</div>
				</div>

				<footer className="flex flex-col items-center gap-3 pt-8 pb-16 sm:pb-12">
					<SimpleLogoIcon className="text-base-800 size-10" aria-hidden />
					<p className="text-base-600 text-sm">
						Made by{' '}
						<a
							href="https://x.com/bennobuilder"
							target="_blank"
							rel="noopener noreferrer"
							className="text-base-800 font-medium transition-opacity hover:opacity-70"
						>
							@bennobuilder
						</a>
					</p>
				</footer>
			</main>
		</div>
	);
}

const AppDemo: React.FC = () => {
	return (
		<AppCxProvider>
			<div className="border-base-200 overflow-hidden rounded-2xl border shadow-2xl">
				<MainWindow className="h-[500px]" trafficLights />
			</div>
		</AppCxProvider>
	);
};
