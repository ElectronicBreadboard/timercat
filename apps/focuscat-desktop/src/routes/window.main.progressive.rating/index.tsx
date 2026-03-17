import { Button } from '@repo/ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import { WindowHeader } from '@/components';
import { useSettingsCx } from '@/features/settings';
import { ProgressivePomodoroTimerCx, useTimerCx } from '@/features/timer';

export const Route = createFileRoute('/window/main/progressive/rating/')({
	component: RouteComponent
});

function RouteComponent() {
	const navigate = useNavigate();
	const timerCx = useTimerCx<ProgressivePomodoroTimerCx>();
	const settingsCx = useSettingsCx();
	const settings = useFeatureState(settingsCx.$appSettings);

	const [selectedRatingKey, setSelectedRatingKey] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [editableWork, setEditableWork] = React.useState<number[]>([]);
	const [editableBreak, setEditableBreak] = React.useState<(number | null)[]>([]);
	const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);

	const ratings = settings.timer.progressive.ratings;
	const selectedRating = ratings.find((r) => r.key === selectedRatingKey) ?? null;

	// MARK: - Actions

	const handleSelectRating = React.useCallback(
		(key: string) => {
			const rating = ratings.find((r) => r.key === key);
			if (!rating) return;
			setSelectedRatingKey(key);
			setEditableWork(rating.suggestions.map((s) => s.workMinutes));
			setEditableBreak(rating.suggestions.map((s) => s.breakMinutes));
			setEditingCell(null);
		},
		[ratings]
	);

	const handleSelectSuggestion = React.useCallback(
		async (suggestionIndex: number) => {
			if (isSubmitting || selectedRating == null) return;
			setIsSubmitting(true);

			const suggestion = selectedRating.suggestions[suggestionIndex];
			if (suggestion == null) return;
			const workMinutes = editableWork[suggestionIndex] ?? suggestion.workMinutes;
			const breakMinutes =
				editableBreak[suggestionIndex] !== undefined
					? editableBreak[suggestionIndex]
					: suggestion.breakMinutes;

			if (workMinutes !== suggestion.workMinutes || breakMinutes !== suggestion.breakMinutes) {
				const updatedRatings = ratings.map((r) =>
					r.key === selectedRatingKey
						? {
								...r,
								suggestions: r.suggestions.map((s, i) =>
									i === suggestionIndex ? { workMinutes, breakMinutes } : s
								)
							}
						: r
				);
				settingsCx.update({
					timer: {
						...settings.timer,
						progressive: { ...settings.timer.progressive, ratings: updatedRatings }
					}
				});
			}

			await timerCx.advanceWithSuggestion(
				workMinutes * 60,
				breakMinutes != null ? breakMinutes * 60 : null
			);
			navigate({ to: '/window/main' });
		},
		[
			isSubmitting,
			selectedRating,
			selectedRatingKey,
			editableWork,
			editableBreak,
			ratings,
			settingsCx,
			settings.timer,
			timerCx,
			navigate
		]
	);

	// MARK: - UI

	return (
		<div className="bg-base-0 flex h-screen w-[300px] flex-col">
			<WindowHeader />

			<div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
				{selectedRating == null ? (
					// Step 1: Rate your focus
					<div className="space-y-6">
						<h1 className="text-base-900 text-xl font-semibold">How was your focus?</h1>
						<div className="flex flex-col gap-2">
							{ratings.map(({ key, label, description }) => (
								<button
									key={key}
									disabled={isSubmitting}
									onClick={() => handleSelectRating(key)}
									className="border-base-200 hover:bg-base-50 flex flex-col items-start rounded-xl border p-4 text-left transition-colors disabled:opacity-50"
								>
									<span className="text-base-900 text-sm font-semibold">{label}</span>
									<span className="text-base-400 text-xs">{description}</span>
								</button>
							))}
						</div>
					</div>
				) : (
					// Step 2: Pick next block duration
					<div className="space-y-6">
						<div>
							<h1 className="text-base-900 text-xl font-semibold">Next block</h1>
							<p className="text-base-400 mt-1 text-sm">How long do you want to focus?</p>
						</div>
						<div className="flex flex-col gap-2">
							{selectedRating.suggestions.map((suggestion, i) => {
								const workMin = editableWork[i] ?? suggestion.workMinutes;
								const breakMin =
									editableBreak[i] !== undefined ? editableBreak[i] : suggestion.breakMinutes;
								const isEditingWork = editingCell?.index === i && editingCell.field === 'work';
								const isEditingBreak = editingCell?.index === i && editingCell.field === 'break';

								return (
									<div
										key={i}
										role="button"
										tabIndex={0}
										onClick={() => !isSubmitting && handleSelectSuggestion(i)}
										onKeyDown={(e) =>
											e.key === 'Enter' && !isSubmitting && handleSelectSuggestion(i)
										}
										className="border-base-200 hover:bg-base-50 flex flex-col items-start rounded-xl border p-4 text-left transition-colors"
									>
										<span
											className="text-base-900 cursor-text text-sm font-semibold"
											onClick={(e) => {
												e.stopPropagation();
												setEditingCell({ index: i, field: 'work' });
											}}
										>
											{isEditingWork ? (
												<input
													type="number"
													autoFocus
													value={workMin}
													min={1}
													max={120}
													onChange={(e) => {
														const v = Math.max(1, Math.min(120, Number(e.target.value)));
														setEditableWork((prev) => prev.map((m, j) => (j === i ? v : m)));
													}}
													onBlur={() => setEditingCell(null)}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															setEditingCell(null);
															handleSelectSuggestion(i);
														}
														e.stopPropagation();
													}}
													onClick={(e) => e.stopPropagation()}
													className="text-base-900 w-10 [appearance:textfield] bg-transparent text-sm font-semibold outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
												/>
											) : (
												workMin
											)}{' '}
											min
										</span>

										{breakMin != null ? (
											<span
												className="text-base-400 cursor-text text-xs"
												onClick={(e) => {
													e.stopPropagation();
													setEditingCell({ index: i, field: 'break' });
												}}
											>
												+
												{isEditingBreak ? (
													<input
														type="number"
														autoFocus
														value={breakMin}
														min={1}
														max={60}
														onChange={(e) => {
															const v = Math.max(1, Math.min(60, Number(e.target.value)));
															setEditableBreak((prev) => prev.map((m, j) => (j === i ? v : m)));
														}}
														onBlur={() => setEditingCell(null)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') setEditingCell(null);
															e.stopPropagation();
														}}
														onClick={(e) => e.stopPropagation()}
														className="text-base-400 w-6 [appearance:textfield] bg-transparent text-xs outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
													/>
												) : (
													breakMin
												)}{' '}
												min break
											</span>
										) : (
											<span className="text-base-400 text-xs">no break</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			<footer className="border-base-200 bg-base-50 flex shrink-0 justify-between border-t px-4 py-3">
				{selectedRating != null ? (
					<Button
						variant="ghost"
						onClick={() => {
							setSelectedRatingKey(null);
							setEditableWork([]);
							setEditableBreak([]);
							setEditingCell(null);
						}}
						disabled={isSubmitting}
					>
						Back
					</Button>
				) : (
					<span />
				)}
				<Button
					variant="ghost"
					onClick={() => navigate({ to: '/window/main' })}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
			</footer>
		</div>
	);
}

interface EditingCell {
	index: number;
	field: 'work' | 'break';
}
