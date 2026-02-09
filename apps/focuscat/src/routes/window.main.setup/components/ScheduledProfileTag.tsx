import React from 'react';
import { Badge, CalendarIcon } from '@/components';
import { cn, hexToRgba } from '@/lib';

export const ScheduledProfileTag: React.FC<TScheduledProfileTagProps> = (props) => {
	const { name, color, onProfileClick } = props;

	const badgeStyle = color != null ? { backgroundColor: hexToRgba(color, 0.1), color } : undefined;

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			if ((e.key === 'Enter' || e.key === ' ') && onProfileClick != null) {
				e.preventDefault();
				onProfileClick();
			}
		},
		[onProfileClick]
	);

	return (
		<Badge
			variant="neutral"
			className={cn(
				'gap-1.5',
				onProfileClick != null && 'cursor-pointer transition-opacity hover:opacity-90'
			)}
			style={badgeStyle}
			role={onProfileClick != null ? 'button' : undefined}
			tabIndex={onProfileClick != null ? 0 : undefined}
			onClick={onProfileClick != null ? () => onProfileClick() : undefined}
			onKeyDown={onProfileClick != null ? handleKeyDown : undefined}
		>
			<span
				className="size-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: color ?? 'var(--color-base-400)' }}
			/>
			{name}
			<CalendarIcon size={10} className="shrink-0 opacity-80" />
		</Badge>
	);
};

interface TScheduledProfileTagProps {
	name: string;
	color: string | null;
	onProfileClick?: () => void;
}
