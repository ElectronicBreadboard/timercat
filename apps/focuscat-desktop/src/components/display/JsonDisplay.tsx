import React from 'react';
import { CheckIcon, CopyIcon, IconButton } from '@/components';
import { cn } from '@/lib';

export const JsonDisplay: React.FC<TJsonDisplayProps> = (props) => {
	const { data, className } = props;
	const [copied, setCopied] = React.useState(false);

	const jsonString = React.useMemo(() => JSON.stringify(data, null, 2), [data]);

	const handleCopy = React.useCallback(() => {
		void navigator.clipboard.writeText(jsonString).then(() => {
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		});
	}, [jsonString]);

	return (
		<div className={cn('relative overflow-y-auto', className)}>
			<pre className="bg-base-50 text-base-600 h-full overflow-auto rounded p-3 font-mono text-xs break-all whitespace-pre-wrap">
				{jsonString}
			</pre>
			<div className="absolute top-2 right-2">
				<IconButton
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleCopy}
					aria-label={copied ? 'Copied' : 'Copy JSON'}
				>
					{copied ? (
						<CheckIcon size={16} className="text-success" />
					) : (
						<CopyIcon size={16} className="text-base-500" />
					)}
				</IconButton>
			</div>
		</div>
	);
};

export interface TJsonDisplayProps {
	data: unknown;
	className?: string;
}
