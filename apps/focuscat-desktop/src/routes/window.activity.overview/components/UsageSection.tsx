import React from 'react';
import { Meter } from '@/components';
import { formatDuration } from '@/lib';

export const UsageSection: React.FC<TUsageSectionProps> = (props) => {
	const { title, entries, fallbackIcon } = props;
	const maxSeconds = entries[0]?.totalSeconds ?? 0;

	return (
		<div className="flex flex-col gap-2">
			<div className="text-base-500 px-2 text-xs font-medium">{title}</div>
			<div className="flex flex-col gap-1">
				{entries.map((entry) => (
					<div key={entry.name} className="flex items-center gap-2.5 px-2 py-1.5">
						{entry.icon != null ? (
							<img src={entry.icon} alt="" className="size-5 shrink-0 rounded" />
						) : (
							fallbackIcon
						)}
						<span className="text-base-800 min-w-0 flex-1 truncate text-sm">{entry.name}</span>
						<span className="text-base-500 shrink-0 text-xs tabular-nums">
							{formatDuration(entry.totalSeconds)}
						</span>
						<Meter
							value={entry.totalSeconds}
							max={maxSeconds}
							color={entry.color ?? '#9ca3af'}
							className="w-16 shrink-0"
						/>
					</div>
				))}
			</div>
		</div>
	);
};

export interface TUsageSectionProps {
	title: string;
	entries: TUsageEntry[];
	fallbackIcon: React.ReactNode;
}

export interface TUsageEntry {
	name: string;
	icon: string | null;
	color: string | null;
	totalSeconds: number;
}
