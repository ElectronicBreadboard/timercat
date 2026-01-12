import { Switch } from '@base-ui/react/switch';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import React from 'react';
import { specta } from '@/environment';
import { useTimer } from '@/features/timer';
import { useAppSettings, useTimerState } from '@/hooks';

export const Route = createFileRoute('/window/main/settings/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const [settings, setSettings] = useAppSettings();
	const timerState = useTimerState();
	const { cycleSpeed } = useTimer();

	// MARK: - Actions

	const handleBack = React.useCallback(() => {
		navigate({ to: '/window/main' });
	}, [navigate]);

	const handleDebugToggle = React.useCallback(
		async (checked: boolean) => {
			const updated = { ...settings, debug: checked };
			setSettings(updated);
			await specta.commands.setSettings(updated);
		},
		[settings, setSettings]
	);

	const handleSettingChange = React.useCallback(
		async (key: keyof specta.AppSettings, value: number) => {
			const updated = { ...settings, [key]: value };
			setSettings(updated);
			await specta.commands.setSettings(updated);
		},
		[settings, setSettings]
	);

	// MARK: - UI

	return (
		<div className="flex h-screen flex-col bg-white">
			{/* Header */}
			<div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
				<button
					type="button"
					onClick={handleBack}
					className="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				>
					<ArrowLeftIcon size={18} />
				</button>
				<h1 className="text-lg font-semibold text-gray-900">Settings</h1>
			</div>

			{/* Content */}
			<div className="flex-1 space-y-4 overflow-y-auto p-4">
				{/* Timer Settings Section */}
				<div className="space-y-3">
					<h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Timer</h2>

					{/* Work Duration */}
					<NumberInput
						label="Work Duration"
						description="Minutes per work session"
						value={settings.workDurationMinutes}
						min={1}
						max={120}
						onChange={(v) => handleSettingChange('workDurationMinutes', v)}
					/>

					{/* Short Break */}
					<NumberInput
						label="Short Break"
						description="Minutes for short breaks"
						value={settings.shortBreakMinutes}
						min={1}
						max={60}
						onChange={(v) => handleSettingChange('shortBreakMinutes', v)}
					/>

					{/* Long Break */}
					<NumberInput
						label="Long Break"
						description="Minutes for long breaks"
						value={settings.longBreakMinutes}
						min={1}
						max={60}
						onChange={(v) => handleSettingChange('longBreakMinutes', v)}
					/>

					{/* Sessions Before Long Break */}
					<NumberInput
						label="Sessions Before Long Break"
						description="Work sessions before a long break"
						value={settings.sessionsBeforeLongBreak}
						min={1}
						max={10}
						onChange={(v) => handleSettingChange('sessionsBeforeLongBreak', v)}
					/>
				</div>

				{/* Developer Section */}
				<div className="space-y-3">
					<h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Developer</h2>

					{/* Debug Toggle */}
					<label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4">
						<div>
							<span className="text-sm font-medium text-gray-900">Debug Mode</span>
							<p className="text-xs text-gray-500">Show debug information</p>
						</div>
						<Switch.Root
							checked={settings.debug}
							onCheckedChange={handleDebugToggle}
							className="group relative flex h-6 w-11 cursor-pointer items-center rounded-full bg-gray-200 transition-colors data-checked:bg-green-500"
						>
							<Switch.Thumb className="block size-5 rounded-full bg-white shadow transition-transform group-data-checked:translate-x-5 group-data-unchecked:translate-x-0.5" />
						</Switch.Root>
					</label>

					{/* Timer Speed (Debug only) */}
					{settings.debug && timerState != null && (
						<button
							type="button"
							onClick={cycleSpeed}
							className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
						>
							<div>
								<span className="text-sm font-medium text-gray-900">Timer Speed</span>
								<p className="text-xs text-gray-500">Speed up timer for testing</p>
							</div>
							<span className="font-mono text-sm text-gray-600">{timerState.speed}x</span>
						</button>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="space-y-2 border-t border-gray-200 p-4">
				<button
					type="button"
					onClick={() => specta.commands.quitApp()}
					className="w-full rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
				>
					Quit Focuscat
				</button>
				<p className="text-center text-xs text-gray-400">Focuscat v0.1.0</p>
			</div>
		</div>
	);
}

// MARK: - NumberInput

const NumberInput: React.FC<TNumberInputProps> = (props) => {
	const { label, description, value, min, max, onChange } = props;

	const handleDecrement = React.useCallback(() => {
		if (value > min) {
			onChange(value - 1);
		}
	}, [value, min, onChange]);

	const handleIncrement = React.useCallback(() => {
		if (value < max) {
			onChange(value + 1);
		}
	}, [value, max, onChange]);

	return (
		<div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
			<div>
				<span className="text-sm font-medium text-gray-900">{label}</span>
				<p className="text-xs text-gray-500">{description}</p>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleDecrement}
					disabled={value <= min}
					className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
				>
					−
				</button>
				<span className="w-8 text-center font-mono text-sm text-gray-900">{value}</span>
				<button
					type="button"
					onClick={handleIncrement}
					disabled={value >= max}
					className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-50"
				>
					+
				</button>
			</div>
		</div>
	);
};

interface TNumberInputProps {
	label: string;
	description: string;
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
}
