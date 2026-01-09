import { Button } from '@base-ui/react/button';
import { Switch } from '@base-ui/react/switch';
import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { MinimizeIcon } from '@/components/display/icons';
import { specta } from '@/environment';
import { useAppSettings } from '@/hooks';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const [settings, setSettings] = useAppSettings();

	// MARK: - Actions

	const handleMinimize = React.useCallback(async () => {
		await specta.commands.showCatWindow();
		await specta.commands.hideMainWindow();
	}, []);

	const handleDebugToggle = React.useCallback(
		async (checked: boolean) => {
			const updated = { ...settings, debug: checked };
			setSettings(updated);
			await specta.commands.setSettings(updated);
		},
		[settings]
	);

	// MARK: - Render

	return (
		<div className="flex h-screen flex-col bg-gray-900 text-white">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
				<h1 className="text-lg font-semibold">Focuscat</h1>
				<Button
					className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
					onClick={handleMinimize}
				>
					<MinimizeIcon size={14} />
					<span>Minimize</span>
				</Button>
			</div>

			{/* Content */}
			<div className="flex-1 space-y-4 p-4">
				{/* Settings Section */}
				<div className="rounded-lg bg-gray-800 p-4">
					<h2 className="mb-3 text-sm font-medium text-gray-400">Settings</h2>

					{/* Debug Toggle */}
					<label className="flex cursor-pointer items-center justify-between">
						<span className="text-sm">Debug Mode</span>
						<Switch.Root
							checked={settings.debug}
							onCheckedChange={handleDebugToggle}
							className="group relative flex h-6 w-11 cursor-pointer items-center rounded-full bg-gray-600 transition-colors data-checked:bg-blue-500"
						>
							<Switch.Thumb className="block size-5 rounded-full bg-white transition-transform group-data-checked:translate-x-5 group-data-unchecked:translate-x-0.5" />
						</Switch.Root>
					</label>
				</div>
			</div>

			{/* Footer */}
			<div className="space-y-2 border-t border-gray-800 p-4">
				<Button
					className="w-full rounded-lg bg-red-600/20 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-600/30"
					onClick={() => specta.commands.quitApp()}
				>
					Quit Focus Cat
				</Button>
				<p className="text-center text-xs text-gray-500">Focuscat v0.1.0</p>
			</div>
		</div>
	);
}
