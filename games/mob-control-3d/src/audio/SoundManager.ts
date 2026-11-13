import type { WeaponMode } from '../game/State';

class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private lastCloneSoundTime = 0;
  private clonePitchStep = 0;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmDangerLevel = 0; // 0 = normal tactical groove, 1 = high danger / boss berserk

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && this.bgmTimer === null) {
      this.startBgmLoop();
    }
    return this.ctx;
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled && this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    } else if (this.enabled) {
      this.ensureContext();
    }
    return this.enabled;
  }

  public setBgmDanger(level: number): void {
    this.bgmDangerLevel = Math.max(0, Math.min(1, level));
  }

  private startBgmLoop(): void {
    if (this.bgmTimer !== null) return;
    // D-minor cyber-synthwave bassline & arpeggio sequence (16 steps)
    const bassNotes = [73.42, 73.42, 146.83, 73.42, 87.31, 87.31, 110.0, 98.0];
    const arpNotes = [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, 329.63];

    this.bgmTimer = window.setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const step = this.bgmStep % 8;
      this.bgmStep++;

      const pitchMult = this.bgmDangerLevel > 0.5 ? 1.12246 : 1.0; // Shift up +2 semitones (E minor) during Boss Berserk / Base Danger!

      // 1. Sub-bass pulse on every step
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      const bFreq = bassNotes[step] * pitchMult;
      bassOsc.frequency.setValueAtTime(bFreq, now);
      bassOsc.frequency.exponentialRampToValueAtTime(bFreq * 0.5, now + 0.16);

      const bassVol = this.bgmDangerLevel > 0.5 ? 0.032 : 0.022;
      bassGain.gain.setValueAtTime(bassVol, now);
      bassGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.17);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.18);

      // 2. Cyber arpeggio lead on off-beats or during high danger
      if (step % 2 === 1 || this.bgmDangerLevel > 0.5) {
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();
        arpOsc.type = 'triangle';
        const aFreq = arpNotes[step] * pitchMult;
        arpOsc.frequency.setValueAtTime(aFreq, now);
        arpGain.gain.setValueAtTime(this.bgmDangerLevel > 0.5 ? 0.02 : 0.013, now);
        arpGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.13);
        arpOsc.connect(arpGain);
        arpGain.connect(this.ctx.destination);
        arpOsc.start(now);
        arpOsc.stop(now + 0.14);
      }
    }, 190);
  }

  public playShoot(weapon: WeaponMode): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (weapon === 'rainbow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(460, now + 0.11);
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else if (weapon === 'scatter') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(195, now + 0.07);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    } else if (weapon === 'plasma') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.085);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    } else if (weapon === 'twin') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.055);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.045);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.125);
  }

  public playAirdropDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.24);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playAirdropOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playCloneGate(multiplierOrAdd: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = performance.now();
    if (now - this.lastCloneSoundTime < 38) return;
    if (now - this.lastCloneSoundTime > 650) {
      this.clonePitchStep = 0;
    } else {
      this.clonePitchStep = Math.min(18, this.clonePitchStep + 1);
    }
    this.lastCloneSoundTime = now;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const baseFreq = multiplierOrAdd >= 10 ? 580 : 440;
    const freq = baseFreq * Math.pow(1.045, this.clonePitchStep);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, t + 0.065);

    gain.gain.setValueAtTime(0.075, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playChampionSpawn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.42);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.44);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  public playOrbitalStrike(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.65);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.7);
  }

  public playGearGrind(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(90, t + 0.06);

    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  public playUpgrade(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      gain.gain.setValueAtTime(0.09, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.15);
    });
  }

  public playBanelingPop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.22);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  public playShamanPulse(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.exponentialRampToValueAtTime(587.33, t + 0.18);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playBossRoar(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [92, 138].forEach((baseFreq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq * 1.4, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.75);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.82);
    });
  }

  public playKillStreak(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);
      gain.gain.setValueAtTime(0.085, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.17);
    });
  }

  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'sawtooth' : 'triangle';
      const startT = t + idx * 0.085;
      const dur = idx === notes.length - 1 ? 0.55 : 0.22;
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.11, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startT);
      osc.stop(startT + dur + 0.02);
    });
  }
}

export const sound = new SoundManager();
