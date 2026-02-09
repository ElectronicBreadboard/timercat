import React from 'react';
import { Badge, XIcon } from '@/components';
import { cn, hexToRgba } from '@/lib';

export const ProfileTag: React.FC<TProfileTagProps> = (props) => {
	const { name, color, onRemove, onProfileClick } = props;

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
			<button
				type="button"
				className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full opacity-60 hover:opacity-100"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				onMouseDown={(e) => e.preventDefault()}
			>
				<XIcon size={10} />
			</button>
		</Badge>
	);
};

interface TProfileTagProps {
	name: string;
	color: string | null;
	onRemove: () => void;
	onProfileClick?: () => void;
}
