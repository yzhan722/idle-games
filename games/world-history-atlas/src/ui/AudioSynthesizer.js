// Zero-Dependency Web Audio API Procedural Sound Synthesizer
window.HistoryAtlas = window.HistoryAtlas || {};

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _ensureCtx() {
    if (this.muted) return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return !!this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Soft pop sound when clicking a region or bookmark
  playClickPop() {
    if (!this._ensureCtx()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Historical chime when crossing a major keyframe era
  playEraChime() {
    if (!this._ensureCtx()) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5 - E5 - G5 chord
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + idx * 0.04);
      gain.gain.setValueAtTime(0.05, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.45 + idx * 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.48 + idx * 0.04);
    });
  }
}

window.HistoryAtlas.AudioSynthesizer = AudioSynthesizer;
