import React from 'react';
import { Badge } from '@/components';
import { specta } from '@/environment';
import { useOnSessionComplete } from '@/hooks';
import { hexToRgba, toTuple } from '@/lib';

export const ActiveProfilesView: React.FC = () => {
	const [profiles, setProfiles] = React.useState<specta.FocusProfileDto[]>([]);

	// MARK: - Actions

	const fetchData = React.useCallback(async () => {
		const [isProfilesOk, , profiles] = toTuple(await specta.commands.getActiveFocusProfiles());
		if (isProfilesOk) {
			setProfiles(profiles);
		}
	}, []);

	const handleNavigate = React.useCallback(async (profileId: number) => {
		await specta.commands.showSettingsWindowAtProfile(profileId);
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		fetchData();
	}, [fetchData]);

	useOnSessionComplete(React.useCallback(() => fetchData(), [fetchData]));

	// MARK: - UI

	if (!profiles.length) {
		return (
			<div className="mt-2 flex flex-col gap-1">
				<span className="text-base-400 text-sm">No active profiles</span>
			</div>
		);
	}

	return (
		<div className="mt-2 flex flex-wrap gap-1">
			{profiles.map((profile) => {
				const color = profile.color ?? '#9CA3AF';
				return (
					<Badge
						key={profile.id}
						role="button"
						onClick={() => handleNavigate(profile.id)}
						className="cursor-pointer transition-opacity hover:opacity-80"
						style={{
							backgroundColor: hexToRgba(color, 0.1),
							color
						}}
					>
						{profile.name}
					</Badge>
				);
			})}
		</div>
	);
};
