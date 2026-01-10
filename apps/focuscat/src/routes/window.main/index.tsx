import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SettingsIcon } from 'lucide-react';
import React from 'react';
import { TimerView } from '@/features/timer';

export const Route = createFileRoute('/window/main/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();

	// MARK: - Actions

	const handleSettings = React.useCallback(() => {
		navigate({ to: '/window/main/settings' });
	}, [navigate]);

	// MARK: - UI

	return (
		<div className="relative flex h-screen flex-col bg-white">
			{/* Settings button */}
			<button
				type="button"
				onClick={handleSettings}
				className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
			>
				<SettingsIcon size={18} />
			</button>

			<TimerView className="flex-1" />
		</div>
	);
}
