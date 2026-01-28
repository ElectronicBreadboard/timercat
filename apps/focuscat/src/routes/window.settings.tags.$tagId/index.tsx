import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { hasFormChanged } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { Button, IconButton, TrashIcon } from '@/components';
import { TagForm, useTagsCx } from '@/features/tags';

export const Route = createFileRoute('/window/settings/tags/$tagId/')({
	component: RouteComponent
});

function RouteComponent() {
	const { tagId } = Route.useParams();
	const navigate = useNavigate();
	const tagsCx = useTagsCx();
	const { form, handleSubmit } = useForm(tagsCx.form);
	const isSubmitting = useFeatureState(tagsCx.form.isSubmitting);
	const isDirty = hasFormChanged(form);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		navigate({ to: '/window/settings/tags' });
	}, [navigate]);

	const handleDelete = React.useCallback(async () => {
		const success = await tagsCx.delete(Number(tagId));
		if (success) {
			navigate({ to: '/window/settings/tags' });
		}
	}, [tagsCx, tagId, navigate]);

	const onSubmit = handleSubmit({
		onValidSubmit: async () => {
			const success = await tagsCx.save();
			if (success) {
				navigate({ to: '/window/settings/tags' });
			}
		}
	});

	// MARK: - Effects

	React.useEffect(() => {
		tagsCx.startEdit(Number(tagId));
	}, [tagsCx, tagId]);

	// MARK: - UI

	return (
		<form onSubmit={onSubmit} className="-m-6 flex h-[calc(100%+48px)] flex-col">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-6">
					<div className="flex items-center justify-between">
						<h1 className="text-base-900 text-xl font-semibold">Edit Tag</h1>
						<IconButton
							type="button"
							variant="default"
							size="sm"
							onClick={handleDelete}
							className="hover:bg-error/10 hover:text-error"
							title="Delete tag"
						>
							<TrashIcon size={16} />
						</IconButton>
					</div>
					<TagForm />
				</div>
			</div>

			<footer className="border-base-200 bg-base-50 flex shrink-0 justify-end gap-2 border-t px-6 py-3">
				<Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" variant="primary" disabled={!isDirty || isSubmitting}>
					Save
				</Button>
			</footer>
		</form>
	);
}
