import React from 'react';
import {
	BriefcaseIcon,
	Button,
	CheckIcon,
	CoffeeIcon,
	IconButton,
	PauseIcon,
	PlayIcon,
	XIcon
} from '@/components';
import { cn } from '@/lib';
import { type TTimerActionSlot, type TTimerActionSlots } from './timer-action-slots';

export const TimerActionSlotsView: React.FC<TTimerActionSlotsViewProps> = (props) => {
	const { slots, className, variant = 'default' } = props;

	if (variant === 'compact') {
		return (
			<div className={cn('flex items-center justify-center gap-0.5', className)}>
				{renderCompactSlot(slots.left)}
				{renderCompactSlot(slots.center)}
				{renderCompactSlot(slots.right)}
			</div>
		);
	}

	return (
		<div className={cn('relative flex items-center justify-center', className)}>
			{renderDefaultSlot(slots.left, 'left')}
			{renderDefaultSlot(slots.center, 'center')}
			{renderDefaultSlot(slots.right, 'right')}
		</div>
	);
};

interface TTimerActionSlotsViewProps {
	slots: TTimerActionSlots;
	className?: string;
	variant?: 'default' | 'compact';
}

function renderDefaultSlot(action: TTimerActionSlot | null, slot: 'left' | 'center' | 'right') {
	if (action == null) {
		return null;
	}

	if (action.kind === 'start') {
		return (
			<Button
				variant="primary"
				onClick={action.onClick}
				className="h-12 rounded-full px-8 text-sm font-semibold"
			>
				{action.label}
			</Button>
		);
	}

	const isCenter = slot === 'center';
	return (
		<IconButton
			variant={isCenter ? 'primary' : 'default'}
			onClick={action.onClick}
			className={
				isCenter
					? 'size-14 rounded-full'
					: slot === 'left'
						? 'absolute right-full mr-3 size-11 rounded-full'
						: 'absolute left-full ml-3 size-11 rounded-full'
			}
		>
			{renderActionIcon(action, isCenter ? 24 : 18)}
		</IconButton>
	);
}

function renderCompactSlot(action: TTimerActionSlot | null) {
	if (action == null) {
		return null;
	}

	if (action.kind === 'start') {
		return (
			<Button
				key={action.kind}
				variant="ghost"
				size="sm"
				onClick={action.onClick}
				className="border-base-300 text-base-600 hover:border-base-400 hover:text-base-950 h-6 border px-1.5 text-xs font-semibold transition-colors"
			>
				Start
			</Button>
		);
	}

	return (
		<IconButton
			key={action.kind === 'advance' ? `${action.kind}-${action.advanceTo}` : action.kind}
			variant="bare"
			size="sm"
			onClick={action.onClick}
			className="text-base-400 hover:text-base-950 size-6 p-0 transition-colors"
		>
			{renderActionIcon(action, 14)}
		</IconButton>
	);
}

function renderActionIcon(action: TTimerActionSlot, size: number): React.ReactNode {
	switch (action.kind) {
		case 'start':
		case 'resume':
			return <PlayIcon size={size} />;
		case 'pause':
			return <PauseIcon size={size} />;
		case 'complete':
			return <CheckIcon size={size} />;
		case 'cancel':
			return <XIcon size={size} />;
		case 'advance':
			return action.advanceTo === 'focus' ? (
				<BriefcaseIcon size={size} />
			) : (
				<CoffeeIcon size={size} />
			);
	}
}
