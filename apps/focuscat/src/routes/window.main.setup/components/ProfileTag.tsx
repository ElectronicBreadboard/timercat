import React from 'react';
import { Badge, CalendarIcon, XIcon } from '@/components';
import { cn, hexToRgba } from '@/lib';

export const ProfileTag: React.FC<TProfileTagProps> = (props) => {
	const { name, color, variant, onProfileClick } = props;
	const badgeStyle = React.useMemo(
		() => (color != null ? { backgroundColor: hexToRgba(color, 0.1), color } : undefined),
		[color]
	);

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
				'relative flex gap-1.5 px-1.5 py-0.5 text-sm',
				variant === 'removable' &&
					'[&:has(button:focus-visible)_.tag-remove-icon]:opacity-100 [&:has(button:hover)_.tag-remove-icon]:opacity-100'
			)}
			style={badgeStyle}
		>
			<div
				className={cn(
					'flex min-w-0 flex-1 items-center gap-1.5',
					onProfileClick != null && 'cursor-pointer transition-opacity hover:opacity-90'
				)}
				role={onProfileClick != null ? 'button' : undefined}
				tabIndex={onProfileClick != null ? 0 : undefined}
				onClick={onProfileClick != null ? () => onProfileClick() : undefined}
				onKeyDown={onProfileClick != null ? handleKeyDown : undefined}
			>
				<span className="min-w-0 flex-1 truncate">{name}</span>
				{variant === 'scheduled' ? (
					<CalendarIcon size={12} className="shrink-0 opacity-80" />
				) : (
					<XIcon
						size={12}
						className="tag-remove-icon shrink-0 opacity-60 transition-opacity"
						aria-hidden
					/>
				)}
			</div>
			{/* Hit area on the right so the remove button is easier to click without opening profile */}
			{variant === 'removable' && (
				<button
					type="button"
					className="absolute inset-y-0 right-0 z-10 min-w-10 cursor-pointer"
					aria-label="Remove profile"
					onClick={(e) => {
						e.stopPropagation();
						props.onRemove();
					}}
					onMouseDown={(e) => e.preventDefault()}
				/>
			)}
		</Badge>
	);
};

type TProfileTagProps =
	| {
			name: string;
			color: string | null;
			variant: 'scheduled';
			onProfileClick?: () => void;
	  }
	| {
			name: string;
			color: string | null;
			variant: 'removable';
			onRemove: () => void;
			onProfileClick?: () => void;
	  };
