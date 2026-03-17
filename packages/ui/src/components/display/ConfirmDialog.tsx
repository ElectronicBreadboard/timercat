import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import React from 'react';
import { Button } from '../input/Button';
import { Dialog } from './Dialog';

// MARK: - ConfirmDialog

const ConfirmDialog: React.FC<TConfirmDialogProps> = (props) => {
	const { open, onOpenChange, options, onConfirm, onCancel } = props;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Content>
				<BaseDialog.Title className="text-base-900 mb-2 text-base font-semibold">
					{options.title}
				</BaseDialog.Title>
				<BaseDialog.Description className="text-base-500 mb-6 text-sm">
					{options.description}
				</BaseDialog.Description>
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={onCancel}>
						{options.cancelLabel ?? 'Cancel'}
					</Button>
					<Button variant="danger" onClick={onConfirm}>
						{options.confirmLabel ?? 'Confirm'}
					</Button>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
};

interface TConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	options: TConfirmDialogOptions;
	onConfirm: () => void;
	onCancel: () => void;
}

// MARK: - useConfirmDialog

export function useConfirmDialog(options: TConfirmDialogOptions): TUseConfirmDialogResult {
	// Store open state in a ref so Dialog can be stable (created once, never remounted)
	const openRef = React.useRef(false);
	const [, rerender] = React.useReducer((n) => n + 1, 0);

	const trigger = React.useCallback(() => {
		openRef.current = true;
		rerender();
	}, [rerender]);

	const handleCancel = React.useCallback(() => {
		openRef.current = false;
		rerender();
	}, [rerender]);

	const handleConfirm = React.useCallback(async () => {
		openRef.current = false;
		rerender();
		await options.onConfirm();
	}, [rerender]);

	const Dialog = React.useMemo(
		() =>
			function DialogComponent() {
				return (
					<ConfirmDialog
						open={openRef.current}
						onOpenChange={(open) => {
							openRef.current = open;
							rerender();
						}}
						options={options}
						onConfirm={handleConfirm}
						onCancel={handleCancel}
					/>
				);
			},
		[handleConfirm, handleCancel, rerender]
	);

	return { trigger, Dialog };
}

export interface TConfirmDialogOptions {
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void | Promise<void>;
}

interface TUseConfirmDialogResult {
	trigger: () => void;
	Dialog: () => React.ReactElement;
}
