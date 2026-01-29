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

export class FocusProfileCx {
	public readonly $profiles = createState<specta.FocusProfileDto[]>([]);
	public readonly $editingId = createState<number | null>(null);
	public readonly form: TForm<TFocusProfileFormData, []>;

	constructor() {
		this.form = createForm<TFocusProfileFormData>({
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
								const profiles = this.$profiles.get();
								const isDuplicate = profiles.some(
									(profile) =>
										profile.name.toLowerCase() === value.trim().toLowerCase() &&
										profile.id !== editingId
								);
								if (isDuplicate) {
									cx.registerError({
										code: 'unique',
										message: 'A profile with this name already exists'
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
				rulesEnabled: {
					defaultValue: false
				},
				mode: {
					defaultValue: 'block'
				},
				targets: {
					defaultValue: []
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
		const [areProfilesOk, profilesErr, profiles] = toTuple(
			await specta.commands.getFocusProfiles()
		);
		if (areProfilesOk) {
			this.$profiles.set(profiles);
		} else {
			console.error('Failed to load focus profiles:', profilesErr);
		}
	}

	public startCreate(): void {
		this.$editingId.set(null);
		this.form.fields.name._intialValue = '';
		this.form.fields.color._intialValue = null;
		this.form.fields.rulesEnabled._intialValue = false;
		this.form.fields.mode._intialValue = 'block';
		this.form.fields.targets._intialValue = [];
		this.form.reset();
	}

	public async startEdit(id: number): Promise<void> {
		const [isProfileOk, , profile] = toTuple(await specta.commands.getFocusProfile(id));
		if (!isProfileOk || profile == null) {
			return;
		}

		this.$editingId.set(id);
		this.form.fields.name._intialValue = profile.name;
		this.form.fields.color._intialValue = profile.color ?? null;
		this.form.fields.rulesEnabled._intialValue = profile.rules.length > 0;
		this.form.fields.mode._intialValue = profile.rules[0]?.action ?? 'block';
		this.form.fields.targets._intialValue = profile.rules
			.map(ruleToSelectedItem)
			.filter((item): item is TSelectedItem => item != null);
		this.form.reset();
	}

	public async save(): Promise<boolean> {
		const data = this.form.getValidData();
		if (data == null) {
			return false;
		}

		const editingId = this.$editingId.get();
		const rules: specta.FocusProfileRuleInput[] =
			data.rulesEnabled && data.targets.length > 0
				? data.targets.map((item) => ({
						action: data.mode,
						target: selectedItemToRuleTarget(item)
					}))
				: [];

		if (editingId == null) {
			// Create new profile
			const [isProfileOk, profileErr, profile] = toTuple(
				await specta.commands.createFocusProfile(data.name, data.color, rules)
			);
			if (!isProfileOk) {
				console.error('Failed to create focus profile:', profileErr);
				return false;
			}
			this.$profiles.set([...this.$profiles.get(), profile]);
		} else {
			// Update existing profile
			const [isProfileOk, profileErr, profile] = toTuple(
				await specta.commands.updateFocusProfile(editingId, data.name, data.color, rules)
			);
			if (!isProfileOk) {
				console.error('Failed to update focus profile:', profileErr);
				return false;
			}
			this.$profiles.set(this.$profiles.get().map((p) => (p.id === editingId ? profile : p)));
		}

		return true;
	}

	public async delete(id: number): Promise<boolean> {
		const [ok, err] = toTuple(await specta.commands.deleteFocusProfile(id));
		if (ok) {
			this.$profiles.set(this.$profiles.get().filter((p) => p.id !== id));
			return true;
		}
		console.error('Failed to delete focus profile:', err);
		return false;
	}
}

export interface TFocusProfileFormData {
	name: string;
	color: string | null;
	rulesEnabled: boolean;
	mode: specta.RuleAction;
	targets: TSelectedItem[];
}

function ruleToSelectedItem(rule: specta.FocusProfileRuleDto): TSelectedItem | null {
	const { target } = rule;
	switch (target.type) {
		case 'app':
			return {
				id: target.bundle_id,
				type: 'app',
				bundleId: target.bundle_id,
				name: target.name ?? undefined,
				icon: target.icon ?? undefined,
				color: target.color ?? undefined
			};
		case 'website':
			return {
				id: target.domain,
				type: 'website',
				domain: target.domain,
				name: target.name ?? undefined,
				icon: target.icon ?? undefined,
				color: target.color ?? undefined
			};
		case 'all':
			// Skip 'all' targets - not supported in current UI
			return null;
	}
}

function selectedItemToRuleTarget(item: TSelectedItem): specta.RuleTargetDto {
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

const ReactFocusProfileCx = React.createContext<FocusProfileCx | null>(null);

export const FocusProfileCxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const cx = useMemoCleanup(() => {
		const focusProfileCx = new FocusProfileCx();
		return [focusProfileCx, () => {}];
	}, []);

	return <ReactFocusProfileCx.Provider value={cx}>{children}</ReactFocusProfileCx.Provider>;
};

export function useFocusProfileCx(): FocusProfileCx {
	const cx = React.useContext(ReactFocusProfileCx);
	if (cx == null) {
		throw new Error('useFocusProfileCx must be used within a FocusProfileCxProvider');
	}
	return cx;
}
