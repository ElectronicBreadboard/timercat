import { Button, Input, type TPomodoroCx } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { toTuple } from '@/lib';
import { AddProfileButton, ProfileTag, targetKey, TargetTag } from './components';

export const Route = createFileRoute('/window/main/setup/')({
	validateSearch: (search: Record<string, unknown>): { advance: boolean } => ({
		advance: search['advance'] === true
	}),
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<TPomodoroCx>();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);
	const { advance } = Route.useSearch();

	const [intention, setIntention] = React.useState('');
	const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
	const [profiles, setProfiles] = React.useState<specta.EligibleProfileDto[]>([]);
	const [scheduledProfiles, setScheduledProfiles] = React.useState<specta.FocusProfileDto[]>([]);
	const [isStarting, setIsStarting] = React.useState(false);

	const selectedIdSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
	const selectedProfiles = React.useMemo(
		() =>
			selectedIds
				.map((id) => profiles.find((p) => p.profile.id === id)?.profile)
				.filter((p) => p != null),
		[selectedIds, profiles]
	);
	const unselectedProfiles = React.useMemo(
		() => profiles.filter((p) => !selectedIdSet.has(p.profile.id)).map((p) => p.profile),
		[profiles, selectedIdSet]
	);
	const [rulePreview, setRulePreview] = React.useState<specta.PreviewRulesDto>({
		blocked: [],
		allowed: []
	});

	const showProfiles =
		settings.features.profiles && (profiles.length > 0 || scheduledProfiles.length > 0);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		navigate({ to: '/window/main' });
	}, [navigate]);

	const handleStart = React.useCallback(async () => {
		if (isStarting) {
			return;
		}
		setIsStarting(true);
		if (advance) {
			await timerCx.advance(intention, selectedIds);
		} else {
			await timerCx.start(intention, selectedIds);
		}
		navigate({ to: '/window/main' });
	}, [isStarting, intention, selectedIds, advance, timerCx, navigate]);

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

	// Fetch eligible + active profiles on mount
	React.useEffect(() => {
		if (!settings.features.profiles) {
			return;
		}

		let cancelled = false;
		(async () => {
			const [eligibleResult, activeResult] = await Promise.all([
				specta.commands.getSessionEligibleProfiles().then(toTuple),
				specta.commands.getActiveFocusProfiles().then(toTuple)
			]);
			if (cancelled) {
				return;
			}
			if (eligibleResult.isOk()) {
				const data = eligibleResult.value;
				setProfiles(data);
				setSelectedIds(data.filter((p) => p.autoSelected).map((p) => p.profile.id));

				// Active profiles NOT in eligible list = always_on scheduled
				if (activeResult.isOk()) {
					const eligibleIds = new Set(data.map((p) => p.profile.id));
					setScheduledProfiles(activeResult.value.filter((p) => !eligibleIds.has(p.id)));
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [settings.features.profiles]);

	// Fetch rule preview whenever selection changes
	React.useEffect(() => {
		if (!settings.features.profiles) {
			return;
		}

		let cancelled = false;
		(async () => {
			const result = toTuple(await specta.commands.previewSessionRules(selectedIds));
			if (cancelled) {
				return;
			}
			if (result.isOk()) {
				setRulePreview(result.value);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [selectedIds, settings.features.profiles]);

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
								{scheduledProfiles.map((profile) => (
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

					{rulePreview.blocked.length > 0 && (
						<div className="flex flex-col gap-2">
							<span className="text-base-500 text-xs font-medium tracking-wider uppercase">
								Blocking
							</span>
							<div className="flex flex-wrap gap-2">
								{rulePreview.blocked.map((target) => (
									<TargetTag key={targetKey(target)} target={target} />
								))}
							</div>
						</div>
					)}
					{rulePreview.allowed.length > 0 && (
						<div className="flex flex-col gap-2">
							<span className="text-base-500 text-xs font-medium tracking-wider uppercase">
								Allowing
							</span>
							<div className="flex flex-wrap gap-2">
								{rulePreview.allowed.map((target) => (
									<TargetTag key={targetKey(target)} target={target} />
								))}
							</div>
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
}
