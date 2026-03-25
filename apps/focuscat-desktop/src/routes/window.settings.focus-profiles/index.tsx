import {
	BriefcaseIcon,
	ChevronRightIcon,
	ClockIcon,
	CoffeeIcon,
	IconButton,
	PlusIcon,
	Select
} from '@repo/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { specta } from '@/environment';
import { useFocusProfileCx } from '@/features/focus-profile';
import { SettingGroup, SettingItem, useSettingsCx } from '@/features/settings';

export const Route = createFileRoute('/window/settings/focus-profiles/')({
	component: RouteComponent
});

function RouteComponent() {
	const profileCx = useFocusProfileCx();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const profiles = useFeatureState(profileCx.$profiles);
	const activeProfileIds = useFeatureState(profileCx.$activeProfileIds);

	// MARK: - Actions

	const updateProfiles = React.useCallback(
		(updates: Partial<specta.FocusProfilesSettings>) => {
			settingsCx.update({ profiles: { ...settings.profiles, ...updates } });
		},
		[settingsCx, settings.profiles]
	);

	// MARK: - Effects

	React.useEffect(() => {
		void profileCx.load();
	}, [profileCx]);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-base-900 text-xl font-semibold">Profiles</h1>
				<IconButton
					variant="default"
					size="sm"
					title="Create profile"
					nativeButton={false}
					render={<Link to="/window/settings/focus-profiles/new" />}
				>
					<PlusIcon size={16} />
				</IconButton>
			</div>

			<SettingGroup title="Blocking">
				<SettingItem label="Block when category is" description="Applies to all active profiles">
					<Select
						items={React.useMemo(
							() => [
								{ label: 'Nothing', value: 'none' },
								{ label: 'Distracting Only', value: 'distracting' },
								{ label: 'Neutral + Distracting', value: 'neutral' }
							],
							[]
						)}
						value={settings.profiles.blockThreshold}
						onValueChange={(value) =>
							updateProfiles({ blockThreshold: value as specta.BlockThreshold })
						}
						size="sm"
					/>
				</SettingItem>
			</SettingGroup>

			<SettingGroup title="Your Profiles">
				{profiles.length > 0 ? (
					<ul className="divide-base-100 divide-y">
						{profiles.map((profile) => {
							const activation = profile.activations[0];
							const sessionTypes = activation?.sessionTypes ?? null;
							return (
								<ProfileRow
									key={profile.id}
									profile={profile}
									isActive={activeProfileIds.has(profile.id)}
									isScheduled={
										activation?.scheduleDays != null || activation?.scheduleStartTime != null
									}
									hasFocusOnly={sessionTypes?.length === 1 && sessionTypes.includes('Focus')}
									hasBreakOnly={sessionTypes?.length === 1 && sessionTypes.includes('Break')}
								/>
							);
						})}
					</ul>
				) : (
					<div className="text-base-400 px-4 py-8 text-center text-sm">
						No profiles yet. Create one to get started.
					</div>
				)}
			</SettingGroup>
		</div>
	);
}

// MARK: - Profile Row

const ProfileRow: React.FC<TProfileRowProps> = (props) => {
	const { profile, isActive, isScheduled, hasFocusOnly, hasBreakOnly } = props;

	return (
		<li>
			<Link
				to="/window/settings/focus-profiles/$profileId"
				params={{ profileId: String(profile.id) }}
				className="hover:bg-base-100 active:bg-base-200 flex items-center justify-between px-4 py-3 transition-colors duration-100"
			>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<span
						className="block size-3 shrink-0 rounded-full"
						style={{ backgroundColor: profile.color ?? '#9CA3AF' }}
					/>
					<div className="flex min-w-0 flex-1 items-center gap-1.5">
						<span className="text-base-900 min-w-0 truncate text-sm font-medium">
							{profile.name}
						</span>
						{isActive && <span className="block size-2 shrink-0 rounded-full bg-green-500" />}
						{!profile.enabled && (
							<span className="bg-base-100 text-base-400 shrink-0 rounded px-1.5 py-0.5 text-xs">
								Disabled
							</span>
						)}
					</div>
					<span className="text-base-400 flex shrink-0 items-center gap-1.5">
						{hasFocusOnly && <BriefcaseIcon size={13} aria-hidden />}
						{hasBreakOnly && <CoffeeIcon size={13} aria-hidden />}
						{isScheduled && <ClockIcon size={13} aria-hidden />}
					</span>
				</div>
				<ChevronRightIcon size={16} className="text-base-400 ml-3 shrink-0" />
			</Link>
		</li>
	);
};

interface TProfileRowProps {
	profile: specta.FocusProfileDto;
	isActive: boolean;
	isScheduled: boolean;
	hasFocusOnly: boolean;
	hasBreakOnly: boolean;
}
