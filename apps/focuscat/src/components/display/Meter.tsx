import { Meter as BaseMeter } from '@base-ui/react/meter';
import React from 'react';
import { cn } from '@/lib';

export const Meter: React.FC<TMeterProps> = (props) => {
	const { value, max, color, className } = props;

	return (
		<BaseMeter.Root value={value} min={0} max={max}>
			<BaseMeter.Track
				className={cn('bg-base-100 h-1.5 w-16 overflow-hidden rounded-full', className)}
			>
				<BaseMeter.Indicator
					className="h-full rounded-full transition-all duration-300"
					style={{ backgroundColor: color }}
				/>
			</BaseMeter.Track>
		</BaseMeter.Root>
	);
};

interface TMeterProps {
	value: number;
	max: number;
	color: string;
	className?: string;
}
