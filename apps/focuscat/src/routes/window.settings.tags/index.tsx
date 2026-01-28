import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { ChevronRightIcon, IconButton, PlusIcon } from '@/components';
import { specta } from '@/environment';
import { SettingGroup } from '@/features/settings';
import { useTagsCx } from '@/features/tags';

export const Route = createFileRoute('/window/settings/tags/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const tagsCx = useTagsCx();
	const tags = useFeatureState(tagsCx.$tags);

	const handleCreate = React.useCallback(() => {
		navigate({ to: '/window/settings/tags/new' });
	}, [navigate]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-base-900 text-xl font-semibold">Tags</h1>
				<IconButton variant="default" size="sm" onClick={handleCreate} title="Create tag">
					<PlusIcon size={16} />
				</IconButton>
			</div>

			<SettingGroup title="Your Tags">
				{tags.length > 0 ? (
					<ul className="divide-base-100 divide-y">
						{tags.map((tag) => (
							<TagRow key={tag.id} tag={tag} />
						))}
					</ul>
				) : (
					<div className="text-base-400 px-4 py-8 text-center text-sm">
						No tags yet. Create one to get started.
					</div>
				)}
			</SettingGroup>
		</div>
	);
}

// MARK: - Tag Row

const TagRow: React.FC<TTagRowProps> = (props) => {
	const { tag } = props;

	return (
		<li>
			<Link
				to="/window/settings/tags/$tagId"
				params={{ tagId: String(tag.id) }}
				className="hover:bg-base-100 active:bg-base-200 flex items-center justify-between px-4 py-3 transition-colors duration-100"
			>
				<div className="flex items-center gap-3">
					<span
						className="size-3 shrink-0 rounded-full"
						style={{ backgroundColor: tag.color ?? '#9CA3AF' }}
					/>
					<span className="text-base-900 text-sm font-medium">{tag.name}</span>
				</div>
				<ChevronRightIcon size={16} className="text-base-400" />
			</Link>
		</li>
	);
};

interface TTagRowProps {
	tag: specta.TagDto;
}
