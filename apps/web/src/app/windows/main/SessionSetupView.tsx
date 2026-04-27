import { Button, Input } from '@repo/ui';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/app';
import { type CountdownTimerCx, type PomodoroTimerCx } from '@/features/timer';

export const SessionSetupView: React.FC<TSessionSetupViewProps> = (props) => {
	const { timerCx } = props;
	const mode = useFeatureState(timerCx.$sessionSetupRequested);
	const [intention, setIntention] = React.useState('');
	const [isStarting, setIsStarting] = React.useState(false);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		timerCx.dismissSessionSetup();
	}, [timerCx]);

	const handleStart = React.useCallback(() => {
		if (isStarting) {
			return;
		}
		setIsStarting(true);
		if (timerCx.mode === 'pomodoro' && mode === 'advance') {
			void timerCx.advance({ intention });
		} else {
			void timerCx.start({ intention });
		}
	}, [isStarting, intention, mode, timerCx]);

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-full flex-col">
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

export interface TSessionSetupViewProps {
	timerCx: CountdownTimerCx | PomodoroTimerCx;
}
