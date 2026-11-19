// Era background music: generated live with the Web Audio API (no audio files, nothing to download).
// Six styles follow the year on the map and cross-fade when the era changes:
//   青铜古乐 (before 800 BC) · 琴歌古调 (800 BC–500) · 中古圣咏 (500–1450) · 近世羽管键琴 (1450–1789)
//   · 浪漫钢琴 (1789–1914) · 现代氛围 (1914–)
// Off by default. It only runs while switched on and the page is visible, and schedules roughly one bar ahead.
window.HistoryAtlas = window.HistoryAtlas || {};

(function () {
  const STORE_KEY = "atlas.music";
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = { M: [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], sus: [0, 5, 7] };

  // to: first year of the next style. scale: semitones over root. prog: [chord root offset, chord type] per bar.
  const STYLES = [
    { id: "ancient", label: "青铜古乐", to: -800, bpm: 56, root: 50, scale: [0, 1, 4, 5, 7, 8, 10],
      lead: "lyre", density: 0.42, drone: { wave: "sawtooth", notes: [0, 7], cut: 480, gain: 0.022 },
      drum: [1, 0, 0, 0.45, 0, 0.7, 0, 0] },
    { id: "classical", label: "琴歌古调", to: 500, bpm: 60, root: 50, scale: [0, 2, 4, 7, 9],
      lead: "qin", density: 0.4, drone: { wave: "triangle", notes: [0, 7], cut: 700, gain: 0.02 },
      drum: [0.7, 0, 0, 0, 0, 0, 0.35, 0] },
    { id: "medieval", label: "中古圣咏", to: 1450, bpm: 48, root: 50, scale: [0, 2, 3, 5, 7, 9, 10],
      lead: "chant", density: 0.5, long: true, drone: { wave: "organ", notes: [0, 7, 12], cut: 900, gain: 0.012 },
      bell: 0.08 },
    { id: "earlymodern", label: "近世羽管键琴", to: 1789, bpm: 76, root: 50, scale: [0, 2, 4, 5, 7, 9, 11],
      lead: "harpsi", density: 0.3, arp: "harpsi", arpSteps: [0, 1, 2, 3, 4, 5, 6, 7], bass: "harpsi",
      prog: [[0, "M"], [7, "M"], [9, "m"], [4, "m"], [5, "M"], [0, "M"], [5, "M"], [7, "M"]] },
    { id: "romantic", label: "浪漫钢琴", to: 1914, bpm: 66, root: 45, scale: [0, 2, 3, 5, 7, 8, 10],
      lead: "piano", density: 0.38, arp: "piano", arpSteps: [0, 2, 3, 4, 6], bass: "piano",
      prog: [[0, "m"], [8, "M"], [3, "M"], [10, "M"], [5, "m"], [8, "M"], [7, "M"], [7, "M"]] },
    { id: "modern", label: "现代氛围", to: Infinity, bpm: 58, root: 48, scale: [0, 2, 4, 6, 7, 9, 11],
      lead: "piano", density: 0.2, pad: true, bass: "piano",
      prog: [[0, "maj7"], [9, "m7"], [5, "maj7"], [7, "sus"]] }
  ];
  const styleFor = year => STYLES.find(s => year < s.to) || STYLES[STYLES.length - 1];

  class AudioSynthesizer {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.year = -3000;
      this.style = null;
      this.switching = false;
      this.timer = null;
      this.drones = [];
      try { this.wanted = localStorage.getItem(STORE_KEY) === "1"; } catch (e) { this.wanted = false; }
      document.addEventListener("visibilitychange", () => this._onVisibility());
    }

    // Browsers only allow audio after a user gesture; main.js calls this on the first click if music was left on.
    get wantsMusic() { return this.wanted; }
    get styleLabel() { return this.style ? this.style.label : styleFor(this.year).label; }

    toggleMusic() {
      this.setEnabled(!this.enabled);
      return this.enabled;
    }

    setEnabled(on) {
      this.wanted = on;
      try { localStorage.setItem(STORE_KEY, on ? "1" : "0"); } catch (e) { /* private mode */ }
      if (on === this.enabled) return;
      this.enabled = on;
      if (on) this._start(); else this._stop();
    }

    setYear(year) {
      this.year = year;
      if (!this.enabled || !this.ctx) return;
      const s = styleFor(year);
      if (this.style && s.id !== this.style.id) this._crossfadeTo(s);
    }

    // ---------- engine
    _graph() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!this.ctx) {
        const c = this.ctx = new AC();
        this.master = c.createGain();
        this.master.gain.value = 0;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -20; comp.ratio.value = 3;
        this.master.connect(comp); comp.connect(c.destination);
        this.bus = c.createGain();
        this.bus.gain.value = 1;
        this.bus.connect(this.master);
        // a soft echo gives the "hall" without a convolution reverb
        const d = c.createDelay(1.5), fb = c.createGain(), tone = c.createBiquadFilter(), wet = c.createGain();
        d.delayTime.value = 0.42; fb.gain.value = 0.33; tone.type = "lowpass"; tone.frequency.value = 1900; wet.gain.value = 0.32;
        this.bus.connect(d); d.connect(tone); tone.connect(fb); fb.connect(d); tone.connect(wet); wet.connect(this.master);
        const n = c.createBuffer(1, c.sampleRate * 0.2, c.sampleRate), ch = n.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        this.noise = n;
      }
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return true;
    }

    _start() {
      if (!this._graph()) { this.enabled = false; return; }
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(1, now + 2.5);
      this._useStyle(styleFor(this.year));
      this._loop();
    }

    _stop() {
      clearInterval(this.timer); this.timer = null;
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + 0.8);
      setTimeout(() => { if (!this.enabled && this.ctx) { this._stopDrones(0); this.ctx.suspend(); } }, 900);
    }

    _onVisibility() {
      if (!this.enabled || !this.ctx) return;
      if (document.hidden) { clearInterval(this.timer); this.timer = null; this.ctx.suspend(); }
      else { this.ctx.resume().catch(() => {}); this.nextTime = this.ctx.currentTime + 0.1; this._loop(); }
    }

    _loop() {
      clearInterval(this.timer);
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => {
        if (this.switching) return;
        const step = 30 / this.style.bpm; // eighth note
        while (this.nextTime < this.ctx.currentTime + 0.6) { this._step(this.nextTime); this.nextTime += step; }
      }, 150);
    }

    _crossfadeTo(s) {
      this.pending = s;
      if (this.switching) return;
      this.switching = true;
      const now = this.ctx.currentTime;
      this.bus.gain.cancelScheduledValues(now);
      this.bus.gain.setValueAtTime(this.bus.gain.value, now);
      this.bus.gain.linearRampToValueAtTime(0, now + 1.4);
      this._stopDrones(1.4);
      setTimeout(() => {
        this.switching = false;
        if (!this.enabled) return;
        this._useStyle(this.pending);
        const t = this.ctx.currentTime;
        this.bus.gain.cancelScheduledValues(t);
        this.bus.gain.setValueAtTime(0, t);
        this.bus.gain.linearRampToValueAtTime(1, t + 2.2);
        this.nextTime = t + 0.1;
        const now2 = styleFor(this.year);
        if (now2.id !== this.style.id) this._crossfadeTo(now2);
      }, 1500);
    }

    _useStyle(s) {
      this.style = s;
      this.bar = 0; this.stepIdx = 0;
      this.deg = s.scale.length; // start on the root one octave up
      this.restBars = 0;
      this._startDrones();
      if (this.onStyle) this.onStyle(s);
    }

    _startDrones() {
      const s = this.style, dr = s.drone;
      if (!dr) return;
      const c = this.ctx, t = c.currentTime;
      const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = dr.cut; filt.Q.value = 0.7;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(dr.gain, t + 3);
      filt.connect(g); g.connect(this.bus);
      const lfo = c.createOscillator(), lfoGain = c.createGain();
      lfo.frequency.value = 0.07; lfoGain.gain.value = dr.cut * 0.35; lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start(t);
      const oscs = [lfo];
      for (const n of dr.notes) {
        const waves = dr.wave === "organ" ? ["triangle", "square"] : [dr.wave];
        for (const w of waves) {
          for (const det of [-5, 5]) {
            const o = c.createOscillator(); o.type = w; o.frequency.value = mtof(s.root - 12 + n); o.detune.value = det;
            const og = c.createGain(); og.gain.value = w === "square" ? 0.35 : 1;
            o.connect(og); og.connect(filt); o.start(t); oscs.push(o);
          }
        }
      }
      this.drones.push({ g, oscs });
    }

    _stopDrones(fade) {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      for (const d of this.drones) {
        d.g.gain.cancelScheduledValues(t);
        d.g.gain.setValueAtTime(d.g.gain.value, t);
        d.g.gain.linearRampToValueAtTime(0, t + fade + 0.05);
        for (const o of d.oscs) o.stop(t + fade + 0.1);
      }
      this.drones = [];
    }

    // ---------- composition: one eighth-note step
    _pitch(deg) {
      const sc = this.style.scale, n = sc.length;
      const oct = Math.floor(deg / n), i = ((deg % n) + n) % n;
      return this.style.root + 12 + sc[i] + 12 * oct;
    }

    _step(t) {
      const s = this.style, k = this.stepIdx, beat = 30 / s.bpm;
      const chord = s.prog ? s.prog[this.bar % s.prog.length] : null;
      const tones = chord ? CHORDS[chord[1]].map(x => (x + chord[0]) % 12) : null;

      if (k === 0) {
        // phrases: three bars of melody, then a lighter bar
        this.restBars = (this.bar % 4 === 3) ? 1 : 0;
        if (chord && s.bass) this._voice(s.bass, t, s.root - 12 + chord[0], beat * 8, 0.11);
        if (chord && s.pad) for (const x of CHORDS[chord[1]]) this._voice("pad", t, s.root + chord[0] + x, beat * 8.5, 0.035);
        if (s.bell && Math.random() < s.bell) this._voice("bell", t + beat * 2, this._pitch(s.scale.length * 2), beat * 6, 0.03);
      }
      if (chord && s.arp && s.arpSteps.includes(k)) {
        const ct = CHORDS[chord[1]], idx = s.arpSteps.indexOf(k);
        const pat = [0, 1, 2, 1, 2, 1, 0, 1];
        const x = ct[pat[idx % pat.length] % ct.length];
        this._voice(s.arp, t, s.root + chord[0] + x, beat * 2, s.arp === "harpsi" ? 0.07 : 0.05);
      }
      if (s.drum && s.drum[k] && Math.random() < 0.85) this._drum(t, s.drum[k]);

      // melody: random walk over the scale, chord tones on strong beats
      const strong = k === 0 || k === 4;
      const p = s.density * (strong ? 1.5 : (k % 2 ? 0.5 : 1)) * (this.restBars ? 0.35 : 1);
      if (this.holdUntil && t < this.holdUntil) { /* long note still sounding */ }
      else if (Math.random() < p) {
        const n = s.scale.length;
        const r = Math.random();
        let move = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.82 ? 2 : r < 0.94 ? -2 : 0;
        let deg = Math.max(0, Math.min(2 * n, this.deg + move));
        if (tones && strong) {
          for (const dd of [0, 1, -1, 2, -2]) {
            const cand = deg + dd;
            if (cand >= 0 && cand <= 2 * n && tones.includes(((this._pitch(cand) - s.root) % 12 + 12) % 12)) { deg = cand; break; }
          }
        }
        this.deg = deg;
        const len = s.long ? (Math.random() < 0.6 ? 4 : 2) : (Math.random() < 0.3 ? 2 : 1);
        this._voice(s.lead, t, this._pitch(deg), beat * len, 0.075);
        this.holdUntil = s.long ? t + beat * (len - 0.5) : 0;
      }

      this.stepIdx = (k + 1) % 8;
      if (this.stepIdx === 0) this.bar++;
    }

    // ---------- instruments
    _env(g, t, peak, attack, decay) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }

    _osc(type, f, t, end, dest, gain = 1, detune = 0) {
      const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
      if (gain !== 1) { const g = this.ctx.createGain(); g.gain.value = gain; o.connect(g); g.connect(dest); } else o.connect(dest);
      o.start(t); o.stop(end);
      return o;
    }

    _voice(kind, t, midi, dur, vol) {
      const c = this.ctx, f = mtof(midi), g = c.createGain();
      let out = g;
      if (kind === "lyre") {
        this._env(g, t, vol, 0.006, 1.6);
        this._osc("triangle", f, t, t + 1.7, g);
        this._osc("sine", f * 2, t, t + 0.7, g, 0.25);
      } else if (kind === "qin") {
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1700; g.connect(lp); out = lp;
        this._env(g, t, vol * 1.1, 0.008, 2.2);
        const o = this._osc("triangle", f * 0.985, t, t + 2.3, g);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.09); // the finger glides onto the note
        this._osc("sine", f * 2, t, t + 0.9, g, 0.18);
      } else if (kind === "chant") {
        const len = Math.max(0.6, dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * 0.65, t + 0.35);
        g.gain.setValueAtTime(vol * 0.65, t + len - 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.5);
        const o = this._osc("sine", f, t, t + len + 0.6, g);
        this._osc("triangle", f * 2, t, t + len + 0.6, g, 0.12);
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 4.8; lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency);
        lfo.start(t + 0.3); lfo.stop(t + len + 0.6);
      } else if (kind === "harpsi") {
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = 2; g.connect(lp); out = lp;
        this._env(g, t, vol, 0.003, 0.85);
        this._osc("sawtooth", f, t, t + 0.95, g);
        this._osc("square", f * 2, t, t + 0.3, g, 0.12);
      } else if (kind === "piano") {
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; g.connect(lp); out = lp;
        const decay = midi < 52 ? 3.2 : 2.4;
        this._env(g, t, vol, 0.004, decay);
        this._osc("sine", f, t, t + decay + 0.1, g);
        this._osc("triangle", f, t, t + decay + 0.1, g, 0.4, 3);
        this._osc("sine", f * 2, t, t + 0.8, g, 0.15);
      } else if (kind === "pad") {
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800; g.connect(lp); out = lp;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 1.4);
        g.gain.setValueAtTime(vol, t + dur - 1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
        this._osc("sawtooth", f, t, t + dur + 1.3, g, 0.5, -6);
        this._osc("sawtooth", f, t, t + dur + 1.3, g, 0.5, 6);
      } else if (kind === "bell") {
        this._env(g, t, vol, 0.004, 3.5);
        this._osc("sine", f, t, t + 3.6, g);
        this._osc("sine", f * 2.76, t, t + 1.2, g, 0.3);
      }
      out.connect(this.bus);
    }

    _drum(t, accent) {
      const c = this.ctx, g = c.createGain();
      this._env(g, t, 0.16 * accent, 0.004, 0.38);
      const o = this._osc("sine", 105, t, t + 0.45, g);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.2);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
      src.buffer = this.noise; bp.type = "bandpass"; bp.frequency.value = 1600; bp.Q.value = 0.8;
      this._env(ng, t, 0.025 * accent, 0.002, 0.05);
      src.connect(bp); bp.connect(ng); ng.connect(this.bus);
      src.start(t); src.stop(t + 0.08);
      g.connect(this.bus);
    }
  }

  window.HistoryAtlas.AudioSynthesizer = AudioSynthesizer;
})();
