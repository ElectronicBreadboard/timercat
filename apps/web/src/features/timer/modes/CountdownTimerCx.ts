import { type TCountdownCx, type TSessionStartInput } from '@repo/ui';
import { createState } from 'feature-state';
import { type AudioCx } from '@/features/audio';
import { type SessionCx } from '@/features/session';
import { type SettingsCx } from '@/features/settings';
import { BaseTimerCx } from './BaseTimerCx';

export class CountdownTimerCx extends BaseTimerCx implements TCountdownCx {
	public readonly mode = 'countdown' as const;
	public readonly $sessionType = createState('countdown');
	public readonly $sessionSetupRequested = createState<'start' | null>(null);

	constructor(settingsCx: SettingsCx, sessionCx: SessionCx, audioCx: AudioCx) {
		super(settingsCx, sessionCx, audioCx);
		this._applyIdleState();
	}

	public dismissSessionSetup(): void {
		this.$sessionSetupRequested.set(null);
	}

	public async start(input?: TSessionStartInput): Promise<void> {
		if (this.$status.get() !== 'idle') return;
		const s = this._settingsCx.$appSettings.get();
		if (s.timer.showSessionSetup && input == null) {
			this.$sessionSetupRequested.set('start');
			return;
		}
		this.$sessionSetupRequested.set(null);
		this._activeSessionId = await this._sessionCx.createSession({
			session_type: 'countdown',
			planned_seconds: this.$totalSeconds.get(),
			intention: input?.intention?.trim() ?? null,
			started_at: Date.now()
		});
		this.$status.set('running');
		this.$startedAt.set(new Date());
		this.startLoop();
	}

	public async reset(): Promise<void> {
		this.stopLoop();
		if (this._activeSessionId != null) {
			await this._sessionCx.cancelSession(
				this._activeSessionId,
				Date.now(),
				this._getElapsedSeconds()
			);
			this._activeSessionId = null;
		}
		this.$status.set('idle');
		this.$startedAt.set(null);
		this.$overtimeSeconds.set(0);
		this._applyIdleState();
		this._updateDocumentTitle();
	}

	public async complete(): Promise<void> {
		this.stopLoop();
		if (this._activeSessionId != null) {
			await this._sessionCx.completeSession(
				this._activeSessionId,
				Date.now(),
				this._getElapsedSeconds()
			);
			this._activeSessionId = null;
		}
		this.$status.set('idle');
		this.$startedAt.set(null);
		this.$overtimeSeconds.set(0);
		this._applyIdleState();
		this._updateDocumentTitle();
	}

	protected _applyIdleState(): void {
		const duration = this._settingsCx.$appSettings.get().timer.countdown.durationMinutes * 60;
		this.$totalSeconds.set(duration);
		this.$remainingSeconds.set(duration);
	}
}
