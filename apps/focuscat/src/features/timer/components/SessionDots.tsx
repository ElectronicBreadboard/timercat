import React from 'react';
import { cn } from '@/lib';

export const SessionDots: React.FC<TSessionDotsProps> = (props) => {
	const { total, completed, className } = props;

	return (
		<div className={cn('flex items-center gap-1.5', className)}>
			{Array.from({ length: total }).map((_, i) => (
				<div
					key={i}
					className={cn(
						'size-2 rounded-full transition-colors',
						i < completed ? 'bg-gray-800' : 'bg-gray-200'
					)}
				/>
			))}
		</div>
	);
};

interface TSessionDotsProps {
	total: number;
	completed: number;
	className?: string;
}
