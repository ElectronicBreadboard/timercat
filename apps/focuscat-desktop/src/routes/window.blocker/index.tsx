import { Badge, hexToRgba } from '@repo/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';
import { Cat } from '@repo/ui';
import { useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/blocker/')({
	component: RouteComponent
});

function RouteComponent() {
	const [violation, setViolation] = React.useState<specta.BlockingViolationDto | null>(null);

	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	// MARK: - Effects

	// Fetch violation on mount (event may have fired before listener was ready),
	// then listen for updates via event.
	React.useEffect(() => {
		let unlisten: (() => void) | undefined;

		(async () => {
			const v = await specta.commands.getBlockingViolation();
			setViolation(v ?? null);

			unlisten = await specta.events.blockingViolationEvent.listen((event) => {
				setViolation(event.payload);
			});
		})();

		return () => {
			unlisten?.();
		};
	}, []);

	// MARK: - UI

	const profileColor = violation?.profileColor ?? '#9CA3AF';

	return (
		<div className="bg-base-0 flex h-screen flex-col">
			<WindowHeader title="Blocked" showBadge={false} />
			<div className="flex flex-1 flex-col items-center justify-center p-6">
				{violation != null ? (
					<div className="flex flex-col items-center gap-1">
						<Cat face={settings.cat.equippedFace} hat={settings.cat.equippedHat} />
						<p className="text-base-900 text-lg font-semibold">
							{describeTarget(violation.blockedTarget)}
						</p>
						<p className="text-base-500 text-sm">
							Blocked by{' '}
							<Badge
								className="cursor-pointer"
								style={{
									backgroundColor: hexToRgba(profileColor, 0.1),
									color: profileColor
								}}
								onClick={() => {
									specta.commands.showSettingsWindowAtProfile(violation.profileId);
								}}
							>
								{violation.profileName}
							</Badge>
						</p>
					</div>
				) : (
					<Cat
						face={settings.cat.equippedFace}
						hat={settings.cat.equippedHat}
						position="centered"
					/>
				)}
			</div>
		</div>
	);
}

function describeTarget(target: specta.BlockedTargetDto): string {
	switch (target.type) {
		case 'website':
			return `${target.domain} is blocked`;
		case 'app':
			return 'This app is blocked';
	}
}
