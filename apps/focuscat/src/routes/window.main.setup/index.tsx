import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, IconButton, Input, WindowHeader, XIcon } from '@/components';
import { specta } from '@/environment';
import { useSettingsCx } from '@/features/settings';
import { useTimerCx } from '@/features/timer';
import { cn, toTuple } from '@/lib';

export const Route = createFileRoute('/window/main/setup/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const [goal, setGoal] = React.useState('');
	const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
	const [profiles, setProfiles] = React.useState<specta.EligibleProfileDto[]>([]);
	const [isStarting, setIsStarting] = React.useState(false);

	// MARK: - Effects

	// Fetch eligible profiles on mount
	React.useEffect(() => {
		if (!settings.features.profiles) {
			return;
		}

		let cancelled = false;
		(async () => {
			const result = toTuple(await specta.commands.getSessionEligibleProfiles());
			if (result.isOk() && !cancelled) {
				const data = result.value;
				setProfiles(data);
				setSelectedIds(
					new Set<number>(data.filter((p) => p.autoSelected).map((p) => p.profile.id))
				);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [settings.features.profiles]);

	// MARK: - Actions

	const handleBack = React.useCallback(() => {
		navigate({ to: '/window/main' });
	}, [navigate]);

	const handleStart = React.useCallback(async () => {
		if (isStarting) {
			return;
		}
		setIsStarting(true);
		await timerCx.start(
			goal.trim() || undefined,
			selectedIds.size > 0 ? [...selectedIds] : undefined
		);
		navigate({ to: '/window/main' });
	}, [isStarting, goal, selectedIds, timerCx, navigate]);

	const handleToggleProfile = React.useCallback((id: number) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const showProfiles = settings.features.profiles && profiles.length > 0;

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-screen w-[300px] flex-col">
			<WindowHeader />

			{/* Content */}
			<div className="flex flex-1 flex-col px-6 pt-2">
				<h1 className="text-base-900 text-xl font-semibold">New Session</h1>
				<label className="text-base-900 mt-4 text-sm font-medium">What are you focusing on?</label>
				<Input
					value={goal}
					onChange={(e) => setGoal((e.target as HTMLInputElement).value)}
					onKeyDown={(e) => e.key === 'Enter' && handleStart()}
					placeholder="e.g., Write docs"
					size="sm"
					className="mt-2"
					autoFocus
				/>

				{showProfiles && (
					<div className="mt-6">
						<span className="text-base-500 text-xs font-medium tracking-wider uppercase">
							Focus Profiles
						</span>
						<div className="mt-2 flex flex-wrap gap-2">
							{profiles.map(({ profile }) => (
								<ProfileChip
									key={profile.id}
									name={profile.name}
									color={profile.color}
									selected={selectedIds.has(profile.id)}
									onClick={() => handleToggleProfile(profile.id)}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="flex shrink-0 items-center gap-2 px-6 pb-4">
				<IconButton
					variant="default"
					onClick={handleBack}
					className="size-12 shrink-0 rounded-full"
				>
					<XIcon size={18} />
				</IconButton>
				<Button
					variant="primary"
					onClick={handleStart}
					disabled={isStarting}
					className="h-12 flex-1 rounded-full text-sm font-semibold"
				>
					START
				</Button>
			</div>
		</div>
	);
}

// MARK: - ProfileChip

const ProfileChip: React.FC<TProfileChipProps> = (props) => {
	const { name, color, selected, onClick } = props;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-100',
				'focus-visible:ring-primary outline-none focus-visible:ring-2',
				selected
					? 'border-transparent text-white'
					: 'border-base-200 bg-base-50 text-base-600 hover:bg-base-100'
			)}
			style={selected && color != null ? { backgroundColor: color } : undefined}
		>
			{name}
		</button>
	);
};

interface TProfileChipProps {
	name: string;
	color: string | null;
	selected: boolean;
	onClick: () => void;
}
