import {
	bitwiseFlag,
	createForm,
	FormFieldReValidateMode,
	FormFieldValidateMode,
	type TForm
} from 'feature-form';
import { createState } from 'feature-state';
import React from 'react';
import { createValidator } from 'validation-adapter';
import { type TSelectedItem } from '@/components';
import { specta } from '@/environment';
import { useMemoCleanup } from '@/hooks';
import { toTuple } from '@/lib';

export class TagsCx {
	public readonly $tags = createState<specta.TagDto[]>([]);
	public readonly $editingId = createState<number | null>(null);
	public readonly form: TForm<TTagFormData, []>;

	constructor() {
		this.form = createForm<TTagFormData>({
			fields: {
				name: {
					defaultValue: '',
					validator: createValidator([
						{
							key: 'min-length',
							validate: (cx) => {
								const value = cx.value as string;
								if (value.trim().length < 3) {
									cx.registerError({
										code: 'min-length',
										message: 'Name must be at least 3 characters'
									});
								}
							}
						},
						{
							key: 'unique',
							validate: (cx) => {
								const value = cx.value as string;
								const editingId = this.$editingId.get();
								const tags = this.$tags.get();
								const isDuplicate = tags.some(
									(tag) =>
										tag.name.toLowerCase() === value.trim().toLowerCase() && tag.id !== editingId
								);
								if (isDuplicate) {
									cx.registerError({
										code: 'unique',
										message: 'A tag with this name already exists'
									});
								}
							}
						}
					])
				},
				color: {
					defaultValue: null,
					validator: createValidator([
						{
							key: 'required',
							validate: (cx) => {
								if (cx.value == null) {
									cx.registerError({
										code: 'required',
										message: 'Please select a color'
									});
								}
							}
						}
					])
				},
				restrictionsEnabled: {
					defaultValue: false
				},
				restrictionsMode: {
					defaultValue: 'block' as TRestrictionMode
				},
				restrictions: {
					defaultValue: [] as TSelectedItem[]
				}
			},
			validateMode: bitwiseFlag(FormFieldValidateMode.OnSubmit),
			reValidateMode: bitwiseFlag(FormFieldReValidateMode.OnBlur, FormFieldReValidateMode.OnChange),
			notifyOnStatusChange: false,
			collectErrorMode: 'firstError'
		});
		this.init();
	}

	private async init(): Promise<void> {
		await this.load();
	}

	public async load(): Promise<void> {
		const [ok, err, tags] = toTuple(await specta.commands.getTags());
		if (ok) {
			this.$tags.set(tags);
		} else {
			console.error('Failed to load tags:', err);
		}
	}

	public startCreate(): void {
		this.$editingId.set(null);
		this.form.fields.restrictionsEnabled._intialValue = false;
		this.form.fields.restrictionsMode._intialValue = 'block';
		this.form.fields.restrictions._intialValue = [];
		this.form.reset();
	}

	public async startEdit(id: number): Promise<void> {
		const tag = this.$tags.get().find((t) => t.id === id);
		if (tag == null) {
			return;
		}

		this.$editingId.set(id);
		this.form.fields.name._intialValue = tag.name;
		this.form.fields.color._intialValue = tag.color ?? null;

		// Load restrictions
		const [ok, , restrictions] = toTuple(await specta.commands.getTagRestrictions(id));

		if (ok && restrictions != null) {
			this.form.fields.restrictionsEnabled._intialValue = true;
			this.form.fields.restrictionsMode._intialValue = restrictions.action as TRestrictionMode;
			this.form.fields.restrictions._intialValue =
				restrictions.items.map(restrictionItemToSelectedItem);
		} else {
			this.form.fields.restrictionsEnabled._intialValue = false;
			this.form.fields.restrictionsMode._intialValue = 'block';
			this.form.fields.restrictions._intialValue = [];
		}

		this.form.reset();
	}

	public async save(): Promise<boolean> {
		const data = this.form.getValidData();
		if (data == null) {
			return false;
		}

		const editingId = this.$editingId.get();

		// Build restrictions
		const restrictions: specta.RestrictionSet | null =
			data.restrictionsEnabled && data.restrictions.length > 0
				? {
						action: data.restrictionsMode,
						items: data.restrictions.map(selectedItemToRestrictionItem)
					}
				: null;

		if (editingId == null) {
			// Create new tag
			const [ok, err, tag] = toTuple(
				await specta.commands.createTag(data.name, data.color, restrictions)
			);
			if (!ok || tag == null) {
				console.error('Failed to create tag:', err);
				return false;
			}
			this.$tags.set([...this.$tags.get(), tag]);
		} else {
			// Update existing tag
			const [ok, err, tag] = toTuple(
				await specta.commands.updateTag(editingId, data.name, data.color, restrictions)
			);
			if (!ok || tag == null) {
				console.error('Failed to update tag:', err);
				return false;
			}
			this.$tags.set(this.$tags.get().map((t) => (t.id === editingId ? tag : t)));
		}

		return true;
	}

	public async delete(id: number): Promise<boolean> {
		const [ok, err] = toTuple(await specta.commands.deleteTag(id));
		if (ok) {
			this.$tags.set(this.$tags.get().filter((t) => t.id !== id));
			return true;
		}
		console.error('Failed to delete tag:', err);
		return false;
	}
}

// MARK: - Converters

function restrictionItemToSelectedItem(item: specta.RestrictionItem): TSelectedItem {
	switch (item.type) {
		case 'app':
			return {
				id: item.bundle_id,
				type: 'app',
				bundleId: item.bundle_id,
				name: item.name ?? undefined,
				icon: item.icon ?? undefined,
				color: item.color ?? undefined
			};
		case 'website':
			return {
				id: item.domain,
				type: 'website',
				domain: item.domain,
				name: item.name ?? undefined,
				icon: item.icon ?? undefined,
				color: item.color ?? undefined
			};
	}
}

function selectedItemToRestrictionItem(item: TSelectedItem): specta.RestrictionItem {
	switch (item.type) {
		case 'app':
			return {
				type: 'app',
				bundle_id: item.bundleId,
				name: item.name ?? null,
				icon: item.icon ?? null,
				color: item.color ?? null
			};
		case 'website':
			return {
				type: 'website',
				domain: item.domain,
				name: item.name ?? null,
				icon: item.icon ?? null,
				color: item.color ?? null
			};
	}
}

// MARK: - React Context

const ReactTagsCx = React.createContext<TagsCx | null>(null);

export const TagsCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const tagsCx = new TagsCx();
		return [tagsCx, () => {}];
	}, []);

	return <ReactTagsCx.Provider value={cx}>{children}</ReactTagsCx.Provider>;
};

export function useTagsCx(): TagsCx {
	const cx = React.useContext(ReactTagsCx);
	if (cx == null) {
		throw new Error('useTagsCx must be used within a TagsCxProvider');
	}
	return cx;
}

// MARK: - Types

export type TRestrictionMode = 'block' | 'allow';

export interface TTagFormData {
	name: string;
	color: string | null;
	restrictionsEnabled: boolean;
	restrictionsMode: TRestrictionMode;
	restrictions: TSelectedItem[];
}
