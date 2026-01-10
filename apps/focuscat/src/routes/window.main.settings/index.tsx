import { Switch } from '@base-ui/react/switch';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import React from 'react';
import { specta } from '@/environment';
import { useAppSettings } from '@/hooks';

export const Route = createFileRoute('/window/main/settings/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const [settings, setSettings] = useAppSettings();

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
			<div className="flex-1 space-y-4 p-4">
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
