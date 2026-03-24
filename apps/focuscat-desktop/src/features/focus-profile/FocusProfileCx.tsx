import { useMemoCleanup } from '@repo/ui';
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
import { specta } from '@/environment';
import { toTuple } from '@/lib';

export type TCategoryMode = 'none' | 'specific' | 'all';

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
				enabled: {
					defaultValue: true
				},
				categories: {
					defaultValue: []
				},
				categoryModes: {
					defaultValue: {}
				},
				scheduleEnabled: {
					defaultValue: false
				},
				scheduleMode: {
					defaultValue: 'always_on'
				},
				scheduleDays: {
					defaultValue: [0, 1, 2, 3, 4]
				},
				scheduleStartTime: {
					defaultValue: '09:00'
				},
				scheduleEndTime: {
					defaultValue: '17:00'
				}
			},
			validateMode: bitwiseFlag(FormFieldValidateMode.OnSubmit),
			reValidateMode: bitwiseFlag(FormFieldReValidateMode.OnBlur, FormFieldReValidateMode.OnChange),
			notifyOnStatusChange: false,
			collectErrorMode: 'firstError'
		});
		void this.load();
	}

	public async load(): Promise<void> {
		const [ok, err, profiles] = toTuple(await specta.commands.getFocusProfiles());
		if (ok) {
			this.$profiles.set(profiles);
		} else {
			console.error('Failed to load focus profiles:', err);
		}
	}

	public startCreate(): void {
		this.$editingId.set(null);
		this.setInitialValues({
			name: '',
			color: null,
			enabled: true,
			categories: [],
			categoryModes: {},
			scheduleEnabled: false,
			scheduleMode: 'always_on',
			scheduleDays: [0, 1, 2, 3, 4],
			scheduleStartTime: '09:00',
			scheduleEndTime: '17:00'
		});
		this.form.reset();
	}

	public async startEdit(id: number): Promise<void> {
		const [isProfileOk, , profile] = toTuple(await specta.commands.getFocusProfile(id));
		if (!isProfileOk || profile == null) {
			return;
		}

		this.$editingId.set(id);
		this.setInitialValues(this.profileToFormData(profile));
		this.form.reset();
	}

	public async save(): Promise<boolean> {
		const data = this.form.getValidData();
		if (data == null) {
			return false;
		}

		const categories: specta.FocusProfileCategoryParams[] = data.categories.map((entry) => ({
			category: entry.category,
			target: entry.target
		}));
		const schedules: specta.FocusProfileScheduleParams[] = data.scheduleEnabled
			? [
					{
						mode: data.scheduleMode,
						days: data.scheduleDays,
						startTime: data.scheduleStartTime,
						endTime: data.scheduleEndTime
					}
				]
			: [];

		const editingId = this.$editingId.get();
		if (editingId == null) {
			const [ok, err, profile] = toTuple(
				await specta.commands.createFocusProfile(
					data.name,
					data.color,
					data.enabled,
					categories,
					schedules
				)
			);
			if (!ok) {
				console.error('Failed to create focus profile:', err);
				return false;
			}
			this.$profiles.set((prev) => [...prev, profile]);
		} else {
			const [ok, err, profile] = toTuple(
				await specta.commands.updateFocusProfile(
					editingId,
					data.name,
					data.color,
					data.enabled,
					categories,
					schedules
				)
			);
			if (!ok) {
				console.error('Failed to update focus profile:', err);
				return false;
			}
			this.$profiles.set((prev) => prev.map((p) => (p.id === editingId ? profile : p)));
		}

		return true;
	}

	public async delete(id: number): Promise<boolean> {
		const [ok, err] = toTuple(await specta.commands.deleteFocusProfile(id));
		if (ok) {
			this.$profiles.set((prev) => prev.filter((p) => p.id !== id));
			return true;
		}
		console.error('Failed to delete focus profile:', err);
		return false;
	}

	private setInitialValues(values: TFocusProfileFormData): void {
		for (const key of Object.keys(values) as (keyof TFocusProfileFormData)[]) {
			(this.form.fields[key] as { _intialValue: unknown })._intialValue = values[key];
		}
	}

	private profileToFormData(profile: specta.FocusProfileDto): TFocusProfileFormData {
		const schedule = profile.schedules[0];
		const categoryModes: Partial<Record<specta.FocusCategory, TCategoryMode>> = {};
		for (const cat of ['focused', 'neutral', 'distracting'] as specta.FocusCategory[]) {
			const targets = profile.categories.filter((c) => c.category === cat).map((c) => c.target);
			if (targets.some((t) => t.type === 'all')) {
				categoryModes[cat] = 'all';
			} else if (targets.length > 0) {
				categoryModes[cat] = 'specific';
			} else {
				categoryModes[cat] = 'none';
			}
		}
		return {
			name: profile.name,
			color: profile.color ?? null,
			enabled: profile.enabled,
			categories: profile.categories.map((assignment) => ({
				category: assignment.category,
				target: assignment.target
			})),
			categoryModes,
			scheduleEnabled: profile.schedules.length > 0,
			scheduleMode: schedule?.mode ?? 'always_on',
			scheduleDays: schedule?.days ?? [0, 1, 2, 3, 4],
			scheduleStartTime: schedule?.startTime ?? '09:00',
			scheduleEndTime: schedule?.endTime ?? '17:00'
		};
	}
}

export interface TFocusProfileFormData {
	name: string;
	color: string | null;
	enabled: boolean;
	categories: TCategoryFormEntry[];
	categoryModes: Partial<Record<specta.FocusCategory, TCategoryMode>>;
	scheduleEnabled: boolean;
	scheduleMode: specta.ScheduleMode;
	scheduleDays: number[];
	scheduleStartTime: string;
	scheduleEndTime: string;
}

/// A single category assignment in the form: which category + which target.
export interface TCategoryFormEntry {
	category: specta.FocusCategory;
	target: specta.FocusTargetDto;
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
