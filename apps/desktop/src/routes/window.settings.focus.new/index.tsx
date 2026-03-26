import { Button } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { hasFormChanged } from 'feature-form';
import { useForm } from 'feature-react/form';
import { useCombinedCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { FocusProfileForm, useFocusProfileCx } from '@/features/focus';

export const Route = createFileRoute('/window/settings/focus/new/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const profileCx = useFocusProfileCx();
	const { form, handleSubmit } = useForm(profileCx.form);
	const isSubmitting = useFeatureState(profileCx.form.isSubmitting);
	const showInvalidState = useCombinedCompute(
		[profileCx.form.isSubmitted, profileCx.form.isValid] as const,
		([{ value: isSubmitted }, { value: isValid }]) => isSubmitted && !isValid,
		[]
	);
	const isDirty = hasFormChanged(form);

	// MARK: - Actions

	const handleCancel = React.useCallback(() => {
		navigate({ to: '/window/settings/focus' });
	}, [navigate]);

	const onSubmit = handleSubmit({
		onValidSubmit: async () => {
			const success = await profileCx.save();
			if (success) {
				navigate({ to: '/window/settings/focus' });
			}
		},
		onInvalidSubmit: () => {
			const errors = form.getErrors();
			const firstInvalidKey = (['name', 'color'] as const).find((key) => errors[key]?.length);
			if (firstInvalidKey != null) {
				document
					.querySelector(`[data-field="${firstInvalidKey}"]`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	});

	// MARK: - Effects

	React.useEffect(() => {
		profileCx.startCreate();
	}, [profileCx]);

	// MARK: - UI

	return (
		<form onSubmit={onSubmit} className="-m-6 flex h-[calc(100%+48px)] flex-col">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-6">
					<h1 className="text-base-900 text-xl font-semibold">New Profile</h1>
					<FocusProfileForm />
				</div>
			</div>

			<footer className="border-base-200 bg-base-50 flex shrink-0 justify-end gap-2 border-t px-6 py-3">
				<Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button
					type="submit"
					variant={showInvalidState ? 'danger' : 'primary'}
					disabled={!isDirty || isSubmitting}
				>
					Create
				</Button>
			</footer>
		</form>
	);
}
