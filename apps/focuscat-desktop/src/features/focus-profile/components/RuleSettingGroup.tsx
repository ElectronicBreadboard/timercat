import { Select, Switch } from '@repo/ui';
import { type TForm } from 'feature-form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect } from '@/components';
import { SettingGroup, SettingItem } from '@/features/settings';
import { type TFocusProfileFormData, type TRuleMode } from '../FocusProfileCx';

export const RuleSettingGroup: React.FC<TRuleSettingGroupProps> = (props) => {
	const { form } = props;

	const ruleEnabled = useCompute(form.fields.ruleEnabled, ({ value }) => value ?? false);
	const ruleMode = useFeatureState(form.fields.ruleMode);
	const ruleTargets = useFeatureState(form.fields.ruleTargets);

	const showTargets = ruleEnabled && ruleMode !== 'block_all';

	const ruleModeItems = React.useMemo<{ value: TRuleMode; label: string }[]>(
		() => [
			{ value: 'block', label: 'Block' },
			{ value: 'block_all', label: 'Block All' },
			{ value: 'allow', label: 'Allow Override' }
		],
		[]
	);
	const modeDescription = React.useMemo<Record<TRuleMode, string>>(
		() => ({
			block: 'Block selected apps & websites during focus',
			block_all: 'Block all apps & websites during focus',
			allow: 'Allow these apps & websites even when blocked by another profile'
		}),
		[]
	);

	return (
		<SettingGroup title="Rules">
			<SettingItem
				label="Enable"
				description="Block or allow apps and websites when this profile is active"
			>
				<Switch
					checked={ruleEnabled}
					onCheckedChange={(checked) => form.fields.ruleEnabled.set(checked)}
					size="sm"
				/>
			</SettingItem>
			{ruleEnabled && (
				<>
					<SettingItem label="Mode" description={modeDescription[ruleMode ?? 'block']}>
						<Select
							items={ruleModeItems}
							value={ruleMode}
							onValueChange={(value) => form.fields.ruleMode.set(value as TRuleMode)}
							size="sm"
							className="w-36"
						/>
					</SettingItem>
					{showTargets && (
						<div className="flex flex-col gap-2 px-4 py-3">
							<div>
								<span className="text-base-900 text-sm font-medium">Apps & Websites</span>
								<p className="text-base-500 text-xs">
									{ruleMode === 'block'
										? 'Block these apps and websites during focus sessions'
										: 'Allow these apps and websites even when blocked by another profile'}
								</p>
							</div>
							<AppWebsiteSelect
								value={ruleTargets ?? []}
								onChange={(newItems) => form.fields.ruleTargets.set(newItems)}
								placeholder={
									ruleMode === 'block'
										? 'Add apps or websites to block...'
										: 'Add apps or websites to allow...'
								}
								popupSide="top"
							/>
						</div>
					)}
				</>
			)}
		</SettingGroup>
	);
};

interface TRuleSettingGroupProps {
	form: TForm<TFocusProfileFormData, []>;
}
