import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { AppWebsiteSelect, Input, Switch, ToggleGroup, type TSelectedItem } from '@/components';
import { SettingGroup, SettingItem } from '@/features/settings';

export const Route = createFileRoute('/window/settings/block/')({
	component: RouteComponent
});

// TODO: When backend supports block settings, add BlockSettings to AppSettings (specta types)
// and use SettingsCx pattern like activity settings:
//   const settingsCx = useSettingsCx();
//   const settings = useFeatureState(settingsCx.$appSettings);
//   settingsCx.update({ block: { ...settings.block, enabled: true } });

interface TimeOfDay {
	hour: number;
	minute: number;
}

type BlockSchedule =
	| { type: 'always' }
	| { type: 'timeRange'; startTime: TimeOfDay; endTime: TimeOfDay };

type BlockMode = 'blacklist' | 'whitelist';

interface BlockSettings {
	enabled: boolean;
	mode: BlockMode;
	schedule: BlockSchedule;
	items: TSelectedItem[];
}

const DEFAULT_SETTINGS: BlockSettings = {
	enabled: false,
	mode: 'blacklist',
	schedule: { type: 'always' },
	items: []
};

function RouteComponent() {
	// TODO: Replace with SettingsCx when backend supports block settings
	const [settings, setSettings] = React.useState<BlockSettings>(DEFAULT_SETTINGS);

	const updateSettings = React.useCallback((updates: Partial<BlockSettings>) => {
		setSettings((prev) => ({ ...prev, ...updates }));
	}, []);

	// MARK: - UI

	return (
		<div className="space-y-6">
			<h1 className="text-base-900 text-xl font-semibold">Block</h1>

			<SettingGroup title="Blocking">
				<SettingItem label="Enable Blocking" description="Block distracting apps and websites">
					<Switch checked={settings.enabled} onCheckedChange={(enabled) => updateSettings({ enabled })} />
				</SettingItem>
			</SettingGroup>

			{settings.enabled && (
				<>
					<SettingGroup title="Mode">
						<SettingItem label="Block Mode" description="What to do with selected items">
							<ToggleGroup
								value={settings.mode}
								onValueChange={(mode) => updateSettings({ mode: mode as BlockMode })}
							>
								<ToggleGroup.Item value="blacklist" className="h-8 w-auto px-3 text-xs font-medium">
									Block
								</ToggleGroup.Item>
								<ToggleGroup.Item value="whitelist" className="h-8 w-auto px-3 text-xs font-medium">
									Allow Only
								</ToggleGroup.Item>
							</ToggleGroup>
						</SettingItem>
					</SettingGroup>

					<SettingGroup title="Apps & Websites">
						<div className="px-4 py-3">
							<AppWebsiteSelect
								value={settings.items}
								onChange={(items) => updateSettings({ items })}
								placeholder={
									settings.mode === 'blacklist'
										? 'Add apps or websites to block...'
										: 'Add apps or websites to allow...'
								}
							/>
						</div>
					</SettingGroup>

					<SettingGroup title="Schedule">
						<SettingItem label="Active Hours" description="When blocking applies">
							<ToggleGroup
								value={settings.schedule.type}
								onValueChange={(type) => {
									if (type === 'always') {
										updateSettings({ schedule: { type: 'always' } });
									} else {
										updateSettings({
											schedule: {
												type: 'timeRange',
												startTime: { hour: 6, minute: 0 },
												endTime: { hour: 22, minute: 0 }
											}
										});
									}
								}}
							>
								<ToggleGroup.Item value="always" className="h-8 w-auto px-3 text-xs font-medium">
									Always
								</ToggleGroup.Item>
								<ToggleGroup.Item value="timeRange" className="h-8 w-auto px-3 text-xs font-medium">
									Time Range
								</ToggleGroup.Item>
							</ToggleGroup>
						</SettingItem>
						{settings.schedule.type === 'timeRange' && (
							<TimeRangeItem
								schedule={settings.schedule}
								onStartTimeChange={(startTime) =>
									updateSettings({
										schedule: { ...settings.schedule, startTime } as BlockSchedule
									})
								}
								onEndTimeChange={(endTime) =>
									updateSettings({
										schedule: { ...settings.schedule, endTime } as BlockSchedule
									})
								}
							/>
						)}
					</SettingGroup>
				</>
			)}
		</div>
	);
}

// MARK: - Time Range Item

const TimeRangeItem: React.FC<TTimeRangeItemProps> = (props) => {
	const { schedule, onStartTimeChange, onEndTimeChange } = props;

	return (
		<div className="border-base-100 flex items-center gap-4 border-t px-4 py-3">
			<div className="flex items-center gap-2">
				<span className="text-base-500 text-sm">From</span>
				<TimeInput value={schedule.startTime} onChange={onStartTimeChange} />
			</div>
			<div className="flex items-center gap-2">
				<span className="text-base-500 text-sm">To</span>
				<TimeInput value={schedule.endTime} onChange={onEndTimeChange} />
			</div>
		</div>
	);
};

interface TTimeRangeItemProps {
	schedule: Extract<BlockSchedule, { type: 'timeRange' }>;
	onStartTimeChange: (time: TimeOfDay) => void;
	onEndTimeChange: (time: TimeOfDay) => void;
}

// MARK: - Time Input

const TimeInput: React.FC<TTimeInputProps> = (props) => {
	const { value, onChange } = props;

	const formatTime = (time: TimeOfDay): string => {
		return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
	};

	const parseTime = (str: string): TimeOfDay | null => {
		const match = str.match(/^(\d{1,2}):(\d{2})$/);
		if (match == null || match[1] == null || match[2] == null) return null;

		const hour = parseInt(match[1], 10);
		const minute = parseInt(match[2], 10);

		if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

		return { hour, minute };
	};

	const [inputValue, setInputValue] = React.useState(() => formatTime(value));

	React.useEffect(() => {
		setInputValue(formatTime(value));
	}, [value]);

	const handleBlur = React.useCallback(() => {
		const parsed = parseTime(inputValue);
		if (parsed != null) {
			onChange(parsed);
		} else {
			setInputValue(formatTime(value));
		}
	}, [inputValue, onChange, value]);

	return (
		<Input
			value={inputValue}
			onChange={(e) => setInputValue(e.target.value)}
			onBlur={handleBlur}
			onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
			placeholder="HH:MM"
			className="w-16 text-center font-mono text-sm"
		/>
	);
};

interface TTimeInputProps {
	value: TimeOfDay;
	onChange: (time: TimeOfDay) => void;
}
