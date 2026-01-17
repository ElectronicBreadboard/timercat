import React from 'react';
import { cn } from '@/lib';

export const TodayCard: React.FC<TTodayCardProps> = (props) => {
	const { className } = props;

	return (
		<div className={cn('flex flex-col p-3', className)}>
			<p className="text-[10px] font-medium tracking-wider text-gray-400 uppercase">Today</p>
		</div>
	);
};

interface TTodayCardProps {
	className?: string;
}
