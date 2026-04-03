import { Button, cn, Input, Select, type TSessionStartInput } from '@repo/ui';
import { useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { toTuple } from '@/lib';
import { AddProfileButton } from './AddProfileButton';
import { ProfileTag } from './ProfileTag';

export const SessionSetupScreen: React.FC<SessionSetupScreenProps> = (props) => {
	const { onStart, upcomingFocusSessionType } = props;
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const [intention, setIntention] = React.useState('');
	const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
	const [profiles, setProfiles] = React.useState<specta.SessionProfileDto[]>([]);
	const [isStarting, setIsStarting] = React.useState(false);
	const [blockThreshold, setBlockThreshold] = React.useState<TBlockingLevelValue>('default');

	const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);

	const alwaysOnProfiles = React.useMemo(
		() => profiles.filter((p) => p.activation === 'always_on').map((p) => p.profile),
		[profiles]
	);
	const selectableProfiles = React.useMemo(
		() => profiles.filter((p) => p.activation !== 'always_on'),
		[profiles]
	);
	const selectedProfiles = React.useMemo(
		() =>
			selectedIds
				.map((id) => selectableProfiles.find((p) => p.profile.id === id)?.profile)
				.filter((p) => p != null),
		[selectedIds, selectableProfiles]
	);
	const unselectedProfiles = React.useMemo(
		() => selectableProfiles.filter((p) => !selectedIdSet.has(p.profile.id)).map((p) => p.profile),
		[selectableProfiles, selectedIdSet]
	);

	const showProfiles = settings.features.focus && profiles.length > 0;
	const showBlockingLevel = showProfiles;
	const blockingLevelItems = React.useMemo(
		() => [
			{
				label: `Use default (${formatBlockThresholdLabel(settings.focus.blockThreshold)})`,
				value: 'default'
			},
			{ label: 'Off', value: 'none' },
			{ label: 'Distracting Only', value: 'distracting' },
			{ label: 'Neutral and Distracting', value: 'neutral' }
		],
		[settings.focus.blockThreshold]
	);

	const categoryPreviewItems = React.useMemo(() => {
		const activeProfiles = [...alwaysOnProfiles, ...selectedProfiles];
		const order: specta.FocusCategory[] = ['focused', 'neutral', 'distracting'];
		const items: { name: string; category: specta.FocusCategory }[] = [];

		for (const category of order) {
			let hasAll = false;
			const specific: string[] = [];

			for (const profile of activeProfiles) {
				for (const assignment of profile.categories) {
					if (assignment.category !== category) continue;
					const target = assignment.target;
					if (target.type === 'all') {
						hasAll = true;
					} else {
						const name = target.name ?? (target.type === 'app' ? target.bundle_id : target.domain);
						if (!specific.includes(name)) specific.push(name);
					}
				}
			}

			if (hasAll) {
				// Collapse to a single * when "all" is set
				items.push({ name: 'All', category });
			} else {
				for (const name of specific) {
					items.push({ name, category });
				}
				// Neutral always gets a trailing * for the implicit default
				if (category === 'neutral') {
					items.push({ name: 'All', category: 'neutral' });
				}
			}
		}

		return items;
	}, [alwaysOnProfiles, selectedProfiles]);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		navigate({ to: '/window/main' });
	}, [navigate]);

	const handleStart = React.useCallback(async () => {
		if (isStarting) {
			return;
		}
		setIsStarting(true);
		await onStart({
			intention,
			profileIds: selectedIds,
			blockThreshold: blockThreshold === 'default' ? null : blockThreshold
		});
		navigate({ to: '/window/main' });
	}, [isStarting, intention, selectedIds, blockThreshold, onStart, navigate]);

	const handleAddProfile = React.useCallback((id: number) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
	}, []);

	const handleRemoveProfile = React.useCallback((id: number) => {
		setSelectedIds((prev) => prev.filter((v) => v !== id));
	}, []);

	const handleOpenProfileInSettings = React.useCallback(async (profileId: number) => {
		await specta.commands.showSettingsWindowAtProfile(profileId);
	}, []);

	// MARK: - Effects

	React.useEffect(() => {
		if (!settings.features.focus) {
			return;
		}

		let cancelled = false;
		(async () => {
			const [ok, , data] = toTuple(
				await specta.commands.getSessionProfiles(upcomingFocusSessionType)
			);
			if (cancelled || !ok) {
				return;
			}
			setProfiles(data);
			setSelectedIds(data.filter((p) => p.activation === 'pre_selected').map((p) => p.profile.id));
		})();

		return () => {
			cancelled = true;
		};
	}, [settings.features.focus, upcomingFocusSessionType]);

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-screen w-[300px] flex-col">
			<WindowHeader />

			{/* Scrollable content */}
			<div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
				<div className="space-y-6">
					<h1 className="text-base-900 text-xl font-semibold">New Session</h1>

					<div className="flex flex-col gap-2">
						<label className="text-base-900 text-sm font-medium">What are you focusing on?</label>
						<Input
							value={intention}
							onChange={(e) => setIntention((e.target as HTMLInputElement).value)}
							onKeyDown={(e) => e.key === 'Enter' && handleStart()}
							placeholder="e.g., Write docs"
							size="sm"
							autoFocus
						/>
					</div>

					{showProfiles && (
						<div className="flex flex-col gap-2">
							<span className="text-base-500 text-xs font-medium tracking-wider uppercase">
								Focus Profiles
							</span>
							<div className="flex flex-wrap gap-2">
								{alwaysOnProfiles.map((profile) => (
									<ProfileTag
										key={profile.id}
										variant="scheduled"
										name={profile.name}
										color={profile.color}
										onProfileClick={() => handleOpenProfileInSettings(profile.id)}
									/>
								))}
								{selectedProfiles.map((profile) => (
									<ProfileTag
										key={profile.id}
										variant="removable"
										name={profile.name}
										color={profile.color}
										onRemove={() => handleRemoveProfile(profile.id)}
										onProfileClick={() => handleOpenProfileInSettings(profile.id)}
									/>
								))}
								{unselectedProfiles.length > 0 && (
									<AddProfileButton profiles={unselectedProfiles} onAdd={handleAddProfile} />
								)}
							</div>
						</div>
					)}

					{(alwaysOnProfiles.length > 0 || selectedProfiles.length > 0) && (
						<div className="flex flex-col gap-2">
							<span className="text-base-500 text-xs font-medium tracking-wider uppercase">
								Category Preview
							</span>
							<div className="flex flex-wrap gap-1.5">
								{categoryPreviewItems.map((item) => (
									<span
										key={`${item.category}:${item.name}`}
										className={cn(
											'rounded-full px-2 py-0.5 text-xs font-medium',
											item.category === 'focused' && 'bg-blue-100 text-blue-700',
											item.category === 'neutral' && 'bg-base-100 text-base-500',
											item.category === 'distracting' && 'bg-red-100 text-red-600'
										)}
									>
										{item.name}
									</span>
								))}
							</div>
						</div>
					)}

					{showBlockingLevel && (
						<div className="flex flex-col gap-2">
							<label className="text-base-900 text-sm font-medium">Blocking Level</label>
							<Select
								items={blockingLevelItems}
								value={blockThreshold}
								onValueChange={(value) => setBlockThreshold(value as TBlockingLevelValue)}
								size="sm"
							/>
							<p className="text-base-500 text-xs">Applies only to this session</p>
						</div>
					)}
				</div>
			</div>

			{/* Footer */}
			<footer className="border-base-200 bg-base-50 flex shrink-0 justify-end gap-2 border-t px-4 py-3">
				<Button variant="ghost" onClick={handleCancel}>
					Cancel
				</Button>
				<Button variant="primary" onClick={handleStart} disabled={isStarting}>
					Start
				</Button>
			</footer>
		</div>
	);
};

interface SessionSetupScreenProps {
	onStart: (input: TSessionStartInput) => Promise<void>;
	upcomingFocusSessionType: specta.FocusSessionType;
}

type TBlockingLevelValue = 'default' | specta.BlockThreshold;

function formatBlockThresholdLabel(blockThreshold: specta.BlockThreshold): string {
	switch (blockThreshold) {
		case 'none':
			return 'Off';
		case 'neutral':
			return 'Neutral and Distracting';
		default:
			return 'Distracting Only';
	}
}
