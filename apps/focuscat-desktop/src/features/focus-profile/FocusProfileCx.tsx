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
import { type TSelectedItem } from '@/components';
import { specta } from '@/environment';
import { toTuple } from '@/lib';

export class FocusProfileCx {
	public readonly $profiles = createState<specta.FocusProfileDto[]>([]);
	public readonly $activeProfileIds = createState<number[]>([]);
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
				ruleEnabled: {
					defaultValue: false
				},
				ruleMode: {
					defaultValue: 'block'
				},
				ruleTargets: {
					defaultValue: []
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
		const [profilesResult, activeResult] = await Promise.all([
			specta.commands.getFocusProfiles().then(toTuple),
			specta.commands.getActiveFocusProfiles().then(toTuple)
		]);
		const [areProfilesOk, profilesErr, profiles] = profilesResult;
		const [areActiveOk, activeErr, activeProfiles] = activeResult;
		if (areProfilesOk) {
			this.$profiles.set(profiles);
		} else {
			console.error('Failed to load focus profiles:', profilesErr);
		}
		if (areActiveOk) {
			this.$activeProfileIds.set(activeProfiles.map((p) => p.id));
		} else {
			console.error('Failed to load active focus profiles:', activeErr);
		}
	}

	public startCreate(): void {
		this.$editingId.set(null);
		this.setInitialValues({
			name: '',
			color: null,
			ruleEnabled: false,
			ruleMode: 'block',
			ruleTargets: [],
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

		const editingId = this.$editingId.get();
		const rules: specta.FocusProfileRuleParams[] = data.ruleEnabled
			? data.ruleMode === 'block_all'
				? [{ action: 'block', target: { type: 'all' } }]
				: data.ruleTargets.map((item) => ({
						action: data.ruleMode === 'allow' ? 'allow' : 'block',
						target: this.selectedItemToRuleTarget(item)
					}))
			: [];
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

		if (editingId == null) {
			// Create new profile
			const [isProfileOk, profileErr, profile] = toTuple(
				await specta.commands.createFocusProfile(data.name, data.color, rules, schedules)
			);
			if (!isProfileOk) {
				console.error('Failed to create focus profile:', profileErr);
				return false;
			}
			this.$profiles.set((prev) => [...prev, profile]);
		} else {
			// Update existing profile
			const [isProfileOk, profileErr, profile] = toTuple(
				await specta.commands.updateFocusProfile(editingId, data.name, data.color, rules, schedules)
			);
			if (!isProfileOk) {
				console.error('Failed to update focus profile:', profileErr);
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
		const firstRule = profile.rules[0];
		const isBlockAll =
			firstRule?.target.type === 'all' &&
			firstRule?.action === 'block' &&
			profile.rules.length === 1;
		const ruleMode: TRuleMode = isBlockAll
			? 'block_all'
			: firstRule?.action === 'allow'
				? 'allow'
				: 'block';
		return {
			name: profile.name,
			color: profile.color ?? null,
			ruleEnabled: profile.rules.length > 0,
			ruleMode,
			ruleTargets: profile.rules
				.map((rule) => this.ruleToSelectedItem(rule))
				.filter((item): item is TSelectedItem => item != null),
			scheduleEnabled: profile.schedules.length > 0,
			scheduleMode: schedule?.mode ?? 'always_on',
			scheduleDays: schedule?.days ?? [0, 1, 2, 3, 4],
			scheduleStartTime: schedule?.startTime ?? '09:00',
			scheduleEndTime: schedule?.endTime ?? '17:00'
		};
	}

	private ruleToSelectedItem(rule: specta.FocusProfileRuleDto): TSelectedItem | null {
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
				return null;
		}
	}

	private selectedItemToRuleTarget(item: TSelectedItem): specta.RuleTargetDto {
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
}

export interface TFocusProfileFormData {
	name: string;
	color: string | null;
	ruleEnabled: boolean;
	ruleMode: TRuleMode;
	ruleTargets: TSelectedItem[];
	scheduleEnabled: boolean;
	scheduleMode: specta.ScheduleMode;
	scheduleDays: number[];
	scheduleStartTime: string;
	scheduleEndTime: string;
}

export type TRuleMode = 'block' | 'block_all' | 'allow';

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
