import { Switch, ToggleGroup } from '@repo/ui';
import { type TForm } from 'feature-form';
import { useCompute, useFeatureState } from 'feature-react/state';
import React from 'react';
import { AppWebsiteSelect } from '@/components';
import { type specta } from '@/environment';
import { SettingGroup, SettingItem } from '@/features/settings';
import { type TFocusProfileFormData } from '../FocusProfileCx';

export const RuleSettingGroup: React.FC<TRuleSettingGroupProps> = (props) => {
	const { form } = props;

	const ruleEnabled = useCompute(form.fields.ruleEnabled, ({ value }) => value ?? false);
	const ruleMode = useFeatureState(form.fields.ruleMode);
	const ruleTargets = useFeatureState(form.fields.ruleTargets);

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
					<SettingItem
						label="Mode"
						description={
							ruleMode === 'block'
								? 'Block selected apps & websites during focus'
								: 'Allow only selected apps & websites during focus'
						}
					>
						<ToggleGroup
							value={ruleMode}
							onValueChange={(value) => form.fields.ruleMode.set(value as specta.RuleAction)}
							size="sm"
						>
							<ToggleGroup.Item value="block" className="w-auto px-3 text-xs font-medium">
								Block
							</ToggleGroup.Item>
							<ToggleGroup.Item value="allow" className="w-auto px-3 text-xs font-medium">
								Allow Only
							</ToggleGroup.Item>
						</ToggleGroup>
					</SettingItem>
					<div className="flex flex-col gap-2 px-4 py-3">
						<div>
							<span className="text-base-900 text-sm font-medium">Apps & Websites</span>
							<p className="text-base-500 text-xs">
								{ruleMode === 'block'
									? 'Block these apps and websites during focus sessions'
									: 'Allow only these apps and websites during focus sessions'}
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
				</>
			)}
		</SettingGroup>
	);
};

interface TRuleSettingGroupProps {
	form: TForm<TFocusProfileFormData, []>;
}
