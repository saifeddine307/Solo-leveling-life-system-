// Web Audio API Procedural Synthesizer for Solo Leveling Original System SFX Architecture
// 100% Original Procedural Audio DNA: Futuristic, Precise, Minimal, Powerful, Premium
import { SoundEvent } from '../types';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private masterVolume: number = 0.7; // 0.0 to 1.0
  private customSfx: Partial<Record<SoundEvent, string>> = {};
  private lastTriggerMap: Map<string, number> = new Map();

  constructor() {
    try {
      const savedEnabled = localStorage.getItem('solo_system_sound_enabled');
      if (savedEnabled !== null) {
        this.soundEnabled = savedEnabled === 'true';
      }
      const savedVol = localStorage.getItem('solo_system_master_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) {
          this.masterVolume = v;
        }
      }
    } catch {
      // ignore
    }
  }

  private initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('solo_system_sound_enabled', String(enabled));
    } catch {
      // ignore
    }
    if (enabled) {
      this.playSound(SoundEvent.BUTTON_CONFIRM);
    }
  }

  public getSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleMute(): boolean {
    this.setSoundEnabled(!this.soundEnabled);
    return !this.soundEnabled;
  }

  public getMuted(): boolean {
    return !this.soundEnabled;
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('solo_system_master_volume', String(this.masterVolume));
    } catch {
      // ignore
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setCustomSfx(custom: Partial<Record<SoundEvent, string>>) {
    this.customSfx = { ...custom };
  }

  /**
   * Main sound event dispatcher with anti-spam debouncing
   */
  public playSound(event: SoundEvent, options?: { largeReward?: boolean }) {
    if (!this.soundEnabled || this.masterVolume <= 0.001) return;

    // Debounce to prevent audio spam or double-firing in StrictMode
    const nowMs = Date.now();
    const lastTime = this.lastTriggerMap.get(event) || 0;
    const minInterval = event === SoundEvent.XP_GAIN ? 40 : 80;
    if (nowMs - lastTime < minInterval) return;
    this.lastTriggerMap.set(event, nowMs);

    // Check if custom audio file is provided
    if (this.customSfx[event]) {
      try {
        const audio = new Audio(this.customSfx[event]);
        audio.volume = this.masterVolume;
        audio.play().catch(() => {
          this.synthesizeEvent(event, options);
        });
        return;
      } catch {
        // Fall back to procedural synthesizer
      }
    }

    this.synthesizeEvent(event, options);
  }

  // =========================================================================
  // SYSTEM AUDIO DNA PRIMITIVES (Procedural Building Blocks)
  // =========================================================================

  /**
   * 1. Low sub/bass pulse: clean sine oscillator with smooth envelope
   */
  private playSubPulse(
    ctx: AudioContext,
    start: number,
    vol: number,
    startFreq = 80,
    endFreq = 42,
    duration = 0.22,
    level = 0.26
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), start + duration);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(level * vol, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /**
   * 2. Short digital transient: crisp micro-chirp burst, zero artifacts
   */
  private playDigitalTransient(
    ctx: AudioContext,
    start: number,
    vol: number,
    startFreq = 2200,
    endFreq = 950,
    duration = 0.028,
    level = 0.16
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), start + duration);

    gain.gain.setValueAtTime(level * vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /**
   * 3. Soft metallic/ceramic tick: high-Q resonant bandpass filtered impulse
   */
  private playMetallicTick(
    ctx: AudioContext,
    start: number,
    vol: number,
    resonantFreq = 3400,
    duration = 0.038,
    level = 0.15
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(resonantFreq, start);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(resonantFreq, start);
    filter.Q.setValueAtTime(8, start);

    gain.gain.setValueAtTime(level * vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /**
   * 4. Futuristic synth texture: warm harmonic detuned layer
   */
  private playSynthTexture(
    ctx: AudioContext,
    start: number,
    vol: number,
    baseFreq = 220,
    duration = 0.35,
    detuneCents = 8,
    level = 0.12
  ) {
    [-detuneCents, detuneCents].forEach((detune) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.detune.setValueAtTime(detune, start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(baseFreq * 2.5, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(level * vol, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    });
  }

  /**
   * 5. Very subtle atmospheric layer: soft filtered sweep
   */
  private playAtmosphericLayer(
    ctx: AudioContext,
    start: number,
    vol: number,
    centerFreq = 520,
    duration = 0.55,
    level = 0.1
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(centerFreq * 0.5, start);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(centerFreq * 0.8, start);
    filter.frequency.exponentialRampToValueAtTime(centerFreq * 1.6, start + duration);
    filter.Q.setValueAtTime(3, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(level * vol, start + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /**
   * 6. Short ascending harmonic tone sequence
   */
  private playAscendingHarmonic(
    ctx: AudioContext,
    start: number,
    vol: number,
    notes: number[],
    stepTime = 0.042,
    noteDur = 0.22,
    level = 0.15
  ) {
    notes.forEach((freq, idx) => {
      const noteStart = start + idx * stepTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(level * vol, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + noteDur);
    });
  }

  /**
   * 7. Short descending confirmation tone
   */
  private playDescendingConfirmation(
    ctx: AudioContext,
    start: number,
    vol: number,
    notes: number[],
    stepTime = 0.045,
    noteDur = 0.18,
    level = 0.13
  ) {
    notes.forEach((freq, idx) => {
      const noteStart = start + idx * stepTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, noteStart + noteDur);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(level * vol, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + noteDur);
    });
  }

  // =========================================================================
  // ORIGINAL SYSTEM AUDIO ARCHITECTURE (Procedural Synthesis)
  // =========================================================================

  private synthesizeEvent(event: SoundEvent, options?: { largeReward?: boolean }) {
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const vol = this.masterVolume;

      switch (event) {
        // -------------------------------------------------------------
        // 1. SYSTEM OPEN: low pulse -> subtle rising tone -> digital confirmation
        // -------------------------------------------------------------
        case SoundEvent.SYSTEM_OPEN:
        case SoundEvent.QUESTION_APPEAR: {
          this.playSubPulse(ctx, now, vol, 75, 45, 0.18, 0.22);
          this.playAscendingHarmonic(ctx, now + 0.02, vol, [392, 587.33, 880], 0.035, 0.16, 0.14);
          this.playDigitalTransient(ctx, now + 0.12, vol, 2200, 1100, 0.03, 0.15);
          break;
        }

        // -------------------------------------------------------------
        // 2. SYSTEM CLOSE: soft descending tone + subtle low pulse
        // -------------------------------------------------------------
        case SoundEvent.SYSTEM_CLOSE: {
          this.playDescendingConfirmation(ctx, now, vol, [880, 587.33, 392], 0.035, 0.14, 0.12);
          this.playSubPulse(ctx, now + 0.04, vol, 55, 30, 0.15, 0.18);
          break;
        }

        // -------------------------------------------------------------
        // 3. QUEST CREATED: small digital confirmation + short metallic tick
        // -------------------------------------------------------------
        case SoundEvent.QUEST_CREATED: {
          this.playDigitalTransient(ctx, now, vol, 1800, 900, 0.025, 0.15);
          this.playMetallicTick(ctx, now + 0.015, vol, 3200, 0.04, 0.18);
          this.playAscendingHarmonic(ctx, now + 0.03, vol, [659.25, 880], 0.03, 0.14, 0.12);
          break;
        }

        // -------------------------------------------------------------
        // 4. QUEST COMPLETED: short confirmation -> rising harmonic -> subtle impact
        // -------------------------------------------------------------
        case SoundEvent.QUEST_COMPLETE: {
          this.playDigitalTransient(ctx, now, vol, 2400, 1200, 0.03, 0.16);
          this.playAscendingHarmonic(
            ctx,
            now + 0.02,
            vol,
            [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
            0.045,
            0.28,
            0.17
          );
          this.playSubPulse(ctx, now + 0.14, vol, 90, 48, 0.28, 0.24);
          this.playMetallicTick(ctx, now + 0.18, vol, 2800, 0.05, 0.12);
          break;
        }

        // -------------------------------------------------------------
        // 5. XP GAIN: small bright digital tick + short ascending tone
        // -------------------------------------------------------------
        case SoundEvent.XP_GAIN: {
          const isLarge = options?.largeReward;
          this.playDigitalTransient(ctx, now, vol, 2600, 1300, 0.02, 0.15);
          if (isLarge) {
            this.playAscendingHarmonic(ctx, now + 0.015, vol, [880, 1174.66, 1567.98], 0.03, 0.18, 0.14);
            this.playSubPulse(ctx, now + 0.03, vol, 110, 60, 0.16, 0.18);
          } else {
            this.playAscendingHarmonic(ctx, now + 0.015, vol, [1046.5, 1318.51], 0.03, 0.15, 0.13);
          }
          break;
        }

        // -------------------------------------------------------------
        // 6. LEVEL UP: LOW RISE -> POWER PULSE -> ASCENDING HARMONIC -> SHORT IMPACT -> FADE
        // -------------------------------------------------------------
        case SoundEvent.LEVEL_UP: {
          // Low rise & power pulse
          this.playSubPulse(ctx, now, vol, 50, 110, 0.25, 0.32);
          this.playSubPulse(ctx, now + 0.2, vol, 110, 38, 0.45, 0.38);

          // Harmonic ascending progression
          const progression = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
          this.playAscendingHarmonic(ctx, now + 0.1, vol, progression, 0.045, 0.42, 0.19);

          // Synth texture layer for grandeur
          this.playSynthTexture(ctx, now + 0.15, vol, 220, 0.45, 10, 0.14);

          // Climax metallic impact
          this.playMetallicTick(ctx, now + 0.35, vol, 2600, 0.08, 0.22);
          break;
        }

        // -------------------------------------------------------------
        // 7. RANK UP: deep atmospheric rise -> layered harmonic tone -> powerful impact -> clean tail
        // -------------------------------------------------------------
        case SoundEvent.RANK_UP: {
          // Deep atmospheric opening
          this.playAtmosphericLayer(ctx, now, vol, 440, 0.75, 0.16);
          this.playSubPulse(ctx, now + 0.05, vol, 60, 140, 0.35, 0.34);

          // Regal layered chord progression
          const royalChord = [329.63, 440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
          this.playAscendingHarmonic(ctx, now + 0.2, vol, royalChord, 0.055, 0.6, 0.2);

          // Powerful low-frequency impact
          this.playSubPulse(ctx, now + 0.55, vol, 140, 32, 0.5, 0.4);
          this.playMetallicTick(ctx, now + 0.55, vol, 3800, 0.08, 0.2);
          break;
        }

        // -------------------------------------------------------------
        // 8. ACHIEVEMENT UNLOCKED: metallic chime + ascending harmonic + tiny shimmer
        // -------------------------------------------------------------
        case SoundEvent.ACHIEVEMENT_UNLOCK: {
          this.playMetallicTick(ctx, now, vol, 3600, 0.05, 0.2);
          this.playAscendingHarmonic(
            ctx,
            now + 0.03,
            vol,
            [587.33, 739.99, 880, 1174.66, 1760], // D Major pentatonic sparkle
            0.045,
            0.45,
            0.18
          );
          // Shimmer overtone
          this.playDigitalTransient(ctx, now + 0.22, vol, 2800, 1800, 0.04, 0.12);
          break;
        }

        // -------------------------------------------------------------
        // 9. TIMER START: single precise activation tone (Focus mode engaged)
        // -------------------------------------------------------------
        case SoundEvent.TIMER_START: {
          this.playDigitalTransient(ctx, now, vol, 1400, 700, 0.025, 0.15);
          this.playAscendingHarmonic(ctx, now + 0.015, vol, [587.33, 880], 0.04, 0.16, 0.16);
          this.playSubPulse(ctx, now + 0.02, vol, 90, 55, 0.15, 0.18);
          break;
        }

        // -------------------------------------------------------------
        // 10. TIMER PAUSE: short descending confirmation
        // -------------------------------------------------------------
        case SoundEvent.TIMER_PAUSE: {
          this.playDescendingConfirmation(ctx, now, vol, [783.99, 523.25], 0.045, 0.16, 0.14);
          this.playSubPulse(ctx, now + 0.03, vol, 65, 35, 0.14, 0.15);
          break;
        }

        // -------------------------------------------------------------
        // 11. TIMER COMPLETE: soft pulse -> ascending confirmation -> harmonic resolution
        // -------------------------------------------------------------
        case SoundEvent.TIMER_COMPLETE: {
          this.playSubPulse(ctx, now, vol, 75, 45, 0.25, 0.24);
          this.playAscendingHarmonic(
            ctx,
            now + 0.06,
            vol,
            [523.25, 659.25, 783.99, 1046.5],
            0.05,
            0.35,
            0.17
          );
          // Soft resonant resolution
          this.playMetallicTick(ctx, now + 0.25, vol, 2200, 0.06, 0.14);
          break;
        }

        // -------------------------------------------------------------
        // 12. AI RESPONSE / SYSTEM ASSISTANT: digital acknowledgement
        // -------------------------------------------------------------
        case SoundEvent.AI_ACTION:
        case SoundEvent.SYSTEM_AI_PING:
        case SoundEvent.PLAN_APPLIED: {
          this.playDigitalTransient(ctx, now, vol, 2200, 1100, 0.025, 0.16);
          this.playAscendingHarmonic(ctx, now + 0.02, vol, [1046.5, 1567.98], 0.035, 0.15, 0.14);
          this.playMetallicTick(ctx, now + 0.06, vol, 3200, 0.03, 0.12);
          break;
        }

        // -------------------------------------------------------------
        // 13. WARNING: two short pulses + subtle low tone
        // -------------------------------------------------------------
        case SoundEvent.WARNING: {
          this.playSubPulse(ctx, now, vol, 90, 60, 0.1, 0.2);
          this.playDescendingConfirmation(ctx, now, vol, [493.88, 440], 0.03, 0.09, 0.15);
          // Second pulse
          this.playSubPulse(ctx, now + 0.12, vol, 90, 60, 0.1, 0.2);
          this.playDescendingConfirmation(ctx, now + 0.12, vol, [493.88, 440], 0.03, 0.09, 0.15);
          break;
        }

        // -------------------------------------------------------------
        // 14. ERROR: short low dissonant pulse + digital cutoff (no harsh alarm)
        // -------------------------------------------------------------
        case SoundEvent.ERROR: {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'sawtooth';

          // Dissonant interval (minor second)
          osc1.frequency.setValueAtTime(140, now);
          osc2.frequency.setValueAtTime(148, now);

          gain.gain.setValueAtTime(0.16 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.14);
          osc2.stop(now + 0.14);
          break;
        }

        // -------------------------------------------------------------
        // 15. AWAKENING: atmospheric opening -> low pulse -> rising synth -> harmonic reveal -> impact -> fade
        // -------------------------------------------------------------
        case SoundEvent.AWAKENING:
        case SoundEvent.AWAKENING_SURGE:
        case SoundEvent.SYSTEM_BOOT:
        case SoundEvent.PROFILE_REVEAL: {
          // Atmospheric opening
          this.playAtmosphericLayer(ctx, now, vol, 360, 0.9, 0.2);
          this.playSubPulse(ctx, now + 0.1, vol, 45, 120, 0.45, 0.35);

          // Synth swell
          this.playSynthTexture(ctx, now + 0.25, vol, 220, 0.6, 12, 0.18);

          // Harmonic reveal
          const chords = [329.63, 440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];
          this.playAscendingHarmonic(ctx, now + 0.45, vol, chords, 0.05, 0.7, 0.2);

          // Powerful short impact
          this.playSubPulse(ctx, now + 0.85, vol, 160, 35, 0.5, 0.42);
          this.playMetallicTick(ctx, now + 0.85, vol, 3400, 0.09, 0.22);
          break;
        }

        // -------------------------------------------------------------
        // BUTTON CONFIRM: high-tech micro tick
        // -------------------------------------------------------------
        case SoundEvent.BUTTON_CONFIRM:
        case SoundEvent.ANSWER_CONFIRM:
        default: {
          this.playDigitalTransient(ctx, now, vol, 1800, 900, 0.025, 0.15);
          this.playMetallicTick(ctx, now, vol, 3200, 0.03, 0.12);
          break;
        }
      }
    } catch {
      // Audio context might be waiting for user gesture
    }
  }

  // Convenient typed helper methods
  public playClick() {
    this.playSound(SoundEvent.BUTTON_CONFIRM);
  }

  public playModalOpen() {
    this.playSound(SoundEvent.SYSTEM_OPEN);
  }

  public playModalClose() {
    this.playSound(SoundEvent.SYSTEM_CLOSE);
  }

  public playQuestCreated() {
    this.playSound(SoundEvent.QUEST_CREATED);
  }

  public playQuestComplete() {
    this.playSound(SoundEvent.QUEST_COMPLETE);
  }

  public playLevelUp() {
    this.playSound(SoundEvent.LEVEL_UP);
  }

  public playRankUp() {
    this.playSound(SoundEvent.RANK_UP);
  }

  public playAchievementUnlock() {
    this.playSound(SoundEvent.ACHIEVEMENT_UNLOCK);
  }

  public playTimerStart() {
    this.playSound(SoundEvent.TIMER_START);
  }

  public playTimerPause() {
    this.playSound(SoundEvent.TIMER_PAUSE);
  }

  public playTimerComplete() {
    this.playSound(SoundEvent.TIMER_COMPLETE);
  }

  public playAiAction() {
    this.playSound(SoundEvent.AI_ACTION);
  }

  public playWarning() {
    this.playSound(SoundEvent.WARNING);
  }

  public playPenaltyWarning() {
    this.playSound(SoundEvent.WARNING);
  }

  public playNegativeWarning() {
    this.playSound(SoundEvent.WARNING);
  }

  public playError() {
    this.playSound(SoundEvent.ERROR);
  }

  public playAwakening() {
    this.playSound(SoundEvent.AWAKENING);
  }

  public playStatUpgrade() {
    this.playSound(SoundEvent.XP_GAIN);
  }

  public playAiPing() {
    this.playSound(SoundEvent.AI_ACTION);
  }

  public playPlanApplied() {
    this.playSound(SoundEvent.AI_ACTION);
  }
}

export const soundManager = new SoundManager();
