import { createFileRoute, Link } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ChevronRightIcon, ClockIcon, IconButton, PlusIcon } from '@/components';
import { specta } from '@/environment';
import { useFocusProfileCx } from '@/features/focus-profile';
import { SettingGroup } from '@/features/settings';

export const Route = createFileRoute('/window/settings/focus-profiles/')({
	component: RouteComponent
});

function RouteComponent() {
	const profileCx = useFocusProfileCx();
	const profiles = useFeatureState(profileCx.$profiles);
	const activeProfileIdsArray = useFeatureState(profileCx.$activeProfileIds);
	const activeProfileIds = React.useMemo(
		() => new Set(activeProfileIdsArray),
		[activeProfileIdsArray]
	);

	React.useEffect(() => {
		void profileCx.load();
	}, [profileCx]);

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

			<SettingGroup title="Your Profiles">
				{profiles.length > 0 ? (
					<ul className="divide-base-100 divide-y">
						{profiles.map((profile) => (
							<ProfileRow
								key={profile.id}
								profile={profile}
								isActive={activeProfileIds.has(profile.id)}
								isScheduled={profile.schedules.length > 0}
							/>
						))}
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
	const { profile, isActive } = props;

	return (
		<li>
			<Link
				to="/window/settings/focus-profiles/$profileId"
				params={{ profileId: String(profile.id) }}
				className="hover:bg-base-100 active:bg-base-200 flex items-center justify-between px-4 py-3 transition-colors duration-100"
			>
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<span
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: profile.color ?? '#9CA3AF' }}
					/>
					<span className="text-base-900 min-w-0 flex-1 truncate text-sm font-medium">
						{profile.name}
					</span>
					{(isScheduled || isActive) && (
						<span className="flex shrink-0 items-center gap-2">
							{isScheduled && (
								<span className="shrink-0" title="Scheduled" aria-hidden>
									<ClockIcon size={14} className="text-base-400" />
								</span>
							)}
							{isActive && (
								<span
									className="h-2 w-2 shrink-0 rounded-full bg-green-500"
									title="Currently active"
									aria-hidden
								/>
							)}
						</span>
					)}
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
}
