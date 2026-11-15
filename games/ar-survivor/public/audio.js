// audio.js — 商业级二次元声效、萌系角色语音合成、治愈八音盒 BGM 与手机触觉震动引擎

const BGM_TRACKS = [
  {
    id: 'kalimba',
    name: '晴空卡林巴',
    stepMs: 240,
    melody: [
      523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33, 0,
      440.00, 523.25, 659.25, 880.00, 783.99, 659.25, 523.25, 0,
      349.23, 440.00, 523.25, 698.46, 659.25, 523.25, 440.00, 523.25,
      392.00, 493.88, 587.33, 783.99, 659.25, 587.33, 523.25, 0
    ],
    bass: [
      261.63, 0, 0, 0, 392.00, 0, 0, 0,
      220.00, 0, 0, 0, 329.63, 0, 0, 0,
      174.61, 0, 0, 0, 261.63, 0, 0, 0,
      196.00, 0, 0, 0, 293.66, 0, 0, 0
    ]
  },
  {
    id: 'lullaby',
    name: '星海摇篮曲',
    stepMs: 270,
    melody: [
      698.46, 880.00, 1046.50, 0, 880.00, 783.99, 698.46, 0,
      659.25, 783.99, 987.77, 0, 783.99, 659.25, 587.33, 0,
      523.25, 659.25, 880.00, 0, 783.99, 659.25, 523.25, 0,
      587.33, 698.46, 880.00, 783.99, 659.25, 587.33, 523.25, 0
    ],
    bass: [
      174.61, 0, 0, 0, 261.63, 0, 0, 0,
      164.81, 0, 0, 0, 246.94, 0, 0, 0,
      220.00, 0, 0, 0, 329.63, 0, 0, 0,
      196.00, 0, 0, 0, 293.66, 0, 0, 0
    ]
  },
  {
    id: 'teatime',
    name: '奶油下午茶',
    stepMs: 220,
    melody: [
      783.99, 987.77, 1174.66, 987.77, 880.00, 783.99, 659.25, 0,
      659.25, 783.99, 987.77, 880.00, 783.99, 659.25, 587.33, 0,
      523.25, 659.25, 783.99, 1046.50, 987.77, 783.99, 659.25, 0,
      587.33, 783.99, 880.00, 1174.66, 987.77, 880.00, 783.99, 0
    ],
    bass: [
      196.00, 0, 0, 0, 293.66, 0, 0, 0,
      164.81, 0, 0, 0, 246.94, 0, 0, 0,
      130.81, 0, 0, 0, 261.63, 0, 0, 0,
      146.83, 0, 0, 0, 293.66, 0, 0, 0
    ]
  }
];

// AR-6 晚安助眠星空八音盒：3首柔音钢片琴/风铃伴眠摇篮曲
const LULLABY_MELODIES = {
  star_lullaby: {
    id: 'star_lullaby',
    name: '星摇篮曲',
    stepMs: 380,
    harmonicMult: 2,
    notes: [
      698.46, 880.00, 1046.50, 880.00, 783.99, 698.46, 587.33, 0,
      659.25, 783.99, 987.77, 783.99, 698.46, 659.25, 523.25, 0
    ],
    pad: [
      174.61, 0, 0, 0, 261.63, 0, 0, 0,
      164.81, 0, 0, 0, 261.63, 0, 0, 0
    ]
  },
  rain_chime: {
    id: 'rain_chime',
    name: '雨后风铃',
    stepMs: 420,
    harmonicMult: 3,
    notes: [
      1046.50, 1174.66, 1318.51, 0, 1567.98, 1318.51, 1046.50, 0,
      880.00, 1046.50, 1318.51, 0, 1174.66, 1046.50, 783.99, 0
    ],
    pad: [
      261.63, 0, 0, 0, 196.00, 0, 0, 0,
      220.00, 0, 0, 0, 196.00, 0, 0, 0
    ]
  },
  cloud_waltz: {
    id: 'cloud_waltz',
    name: '云端圆舞',
    stepMs: 340,
    harmonicMult: 2,
    notes: [
      587.33, 783.99, 987.77, 1174.66, 987.77, 783.99,
      659.25, 783.99, 1046.50, 987.77, 783.99, 659.25,
      587.33, 739.99, 880.00, 783.99, 659.25, 0
    ],
    pad: [
      196.00, 0, 0, 293.66, 0, 0,
      164.81, 0, 0, 246.94, 0, 0,
      146.83, 0, 0, 196.00, 0, 0
    ]
  }
};

// AR-7 窗畔温暖轻电台：3个治愈系 WebAudio 程序化合成声景波段
const COZY_RADIO_CHANNELS = {
  ch01_guitar: {
    id: 'ch01_guitar',
    code: 'CH-01',
    name: 'CH-01 午后木吉他轻弦',
    shortName: '木吉他轻弦',
    subtitle: '暖阳原木指弹和弦',
    freqLabel: 'FM 88.6 MHz',
    stepMs: 290,
    synthStyle: 'acoustic_guitar',
    notes: [
      349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 587.33, 523.25,
      329.63, 392.00, 493.88, 659.25, 493.88, 392.00, 523.25, 392.00,
      293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 392.00, 0,
      261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 0
    ],
    bass: [
      174.61, 0, 0, 0, 174.61, 0, 0, 0,
      164.81, 0, 0, 0, 164.81, 0, 0, 0,
      146.83, 0, 0, 0, 146.83, 0, 0, 0,
      130.81, 0, 0, 0, 196.00, 0, 0, 0
    ]
  },
  ch02_rain_tea: {
    id: 'ch02_rain_tea',
    code: 'CH-02',
    name: 'CH-02 屋檐细雨落茶烟',
    shortName: '细雨落茶烟',
    subtitle: '绵密檐雨与暖瓷风铃',
    freqLabel: 'FM 94.2 MHz',
    stepMs: 340,
    synthStyle: 'rain_bell',
    notes: [
      659.25, 0, 783.99, 880.00, 0, 1046.50, 880.00, 0,
      587.33, 659.25, 0, 783.99, 659.25, 0, 523.25, 0
    ],
    bass: [
      261.63, 0, 0, 0, 220.00, 0, 0, 0,
      196.00, 0, 0, 0, 261.63, 0, 0, 0
    ]
  },
  ch03_hearth_jazz: {
    id: 'ch03_hearth_jazz',
    code: 'CH-03',
    name: 'CH-03 篝火暖茶爵士夜',
    shortName: '篝火爵士夜',
    subtitle: '柴火轻响与柔暖电钢',
    freqLabel: 'FM 101.8 MHz',
    stepMs: 360,
    synthStyle: 'hearth_rhodes',
    chords: [
      [293.66, 349.23, 440.00, 523.25],
      [0],
      [349.23, 440.00, 523.25],
      [659.25],
      [196.00, 329.63, 392.00, 493.88],
      [0],
      [329.63, 392.00, 587.33],
      [523.25],
      [261.63, 329.63, 392.00, 493.88],
      [0],
      [329.63, 392.00, 493.88],
      [587.33],
      [220.00, 329.63, 392.00, 440.00],
      [0],
      [293.66, 392.00, 493.88],
      [0]
    ]
  }
};

class PetAudioAndHaptics {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmEnabled = true;
    this.voiceEnabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.trackIndex = 0;
    this.zhVoice = null;
    this.lastVoiceTime = 0;
    this.lullabyActive = false;
    this.lullabyMuted = false;
    this.lullabyMelodyId = 'star_lullaby';
    this.lullabyTimer = null;
    this.lullabyStep = 0;
    this.lullabyChimeCount = 0;
    this.radioActive = false;
    this.radioChannelId = 'ch01_guitar';
    this.radioTimer = null;
    this.radioStep = 0;
    this.radioNoteCount = 0;
    this.radioWebAudioNodes = 0;
    this.radioChannelCounts = {
      ch01_guitar: 0,
      ch02_rain_tea: 0,
      ch03_hearth_jazz: 0
    };
    this.cocoaChimeCount = 0;
    this.cocoaWebAudioNodes = 0;
    this.crochetStitchCount = 0;
    this.noiseBuffer = null;

    try {
      const savedMute = localStorage.getItem('ar_deepseek_muted');
      if (savedMute === '1') {
        this.muted = true;
        this.bgmEnabled = false;
      }
      const savedTrack = Number(localStorage.getItem('ar_deepseek_bgm_track'));
      if (Number.isInteger(savedTrack) && savedTrack >= 0 && savedTrack < BGM_TRACKS.length) {
        this.trackIndex = savedTrack;
      }
    } catch (e) {}

    this.initSpeechVoices();
  }

  getTrackInfo() {
    const t = BGM_TRACKS[this.trackIndex % BGM_TRACKS.length] || BGM_TRACKS[0];
    return { index: this.trackIndex % BGM_TRACKS.length, id: t.id, name: t.name, total: BGM_TRACKS.length };
  }

  setBgmTrack(index) {
    const safeIdx = ((Number(index) || 0) % BGM_TRACKS.length + BGM_TRACKS.length) % BGM_TRACKS.length;
    this.trackIndex = safeIdx;
    this.bgmStep = 0;
    try {
      localStorage.setItem('ar_deepseek_bgm_track', String(safeIdx));
    } catch (e) {}
    if (this.bgmTimer) {
      this.stopBgmLoop();
      if (!this.muted && this.bgmEnabled) {
        this.startBgmLoop();
      }
    }
    return this.getTrackInfo();
  }

  cycleBgmTrack() {
    const next = (this.trackIndex + 1) % BGM_TRACKS.length;
    const info = this.setBgmTrack(next);
    if (this.muted) {
      this.muted = false;
      this.bgmEnabled = true;
      try {
        localStorage.setItem('ar_deepseek_muted', '0');
      } catch (e) {}
    }
    this.ensureContext();
    this.playSfx('star');
    return info;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.bgmEnabled && !this.muted && !this.bgmTimer) {
      this.startBgmLoop();
    }
    return this.ctx;
  }

  initSpeechVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      const zhList = voices.filter((v) => /zh|cmn|chinese/i.test(v.lang || v.name));
      this.zhVoice =
        zhList.find((v) => /xiaoxiao|xiaoyi|ting|mei|female|girl|siri/i.test(v.name)) ||
        zhList[0] ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  toggleMute() {
    this.muted = !this.muted;
    this.bgmEnabled = !this.muted;
    try {
      localStorage.setItem('ar_deepseek_muted', this.muted ? '1' : '0');
    } catch (e) {}

    if (this.muted) {
      this.stopBgmLoop();
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    } else {
      this.ensureContext();
      this.playSfx('pat');
    }
    return !this.muted;
  }

  // 手机端触觉微震动反馈（跳上手心、触碰指尖、快门拍照、摸头呼噜感）
  haptic(kind = 'tap') {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      switch (kind) {
        case 'palm_land':
          navigator.vibrate([18, 26, 28]);
          break;
        case 'finger_boop':
          navigator.vibrate(14);
          break;
        case 'headpat':
          navigator.vibrate([12, 32, 14]);
          break;
        case 'purr':
          navigator.vibrate([9, 20, 9]);
          break;
        case 'pickup':
          navigator.vibrate([15, 18]);
          break;
        case 'shutter':
          navigator.vibrate([24, 36, 14]);
          break;
        case 'win':
          navigator.vibrate([18, 28, 18, 28, 34]);
          break;
        default:
          navigator.vibrate(10);
          break;
      }
    } catch (e) {}
  }

  // 轻快治愈系八音盒 / 卡林巴琴休闲养成 BGM 循环（支持多首治愈曲目切换）
  startBgmLoop() {
    if (this.bgmTimer || this.muted) return;
    const activeTrack = BGM_TRACKS[this.trackIndex % BGM_TRACKS.length] || BGM_TRACKS[0];

    this.bgmTimer = setInterval(() => {
      if (this.muted || !this.bgmEnabled || this.lullabyActive || this.radioActive || document.hidden) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const track = BGM_TRACKS[this.trackIndex % BGM_TRACKS.length] || BGM_TRACKS[0];
      const melody = track.melody;
      const bass = track.bass;
      const idx = this.bgmStep % melody.length;
      this.bgmStep++;
      const now = ctx.currentTime;

      const note = melody[idx];
      if (note > 0) {
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        overtone.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);
        overtone.frequency.setValueAtTime(note * 2, now);

        const overGain = ctx.createGain();
        overGain.gain.setValueAtTime(0.18, now);
        overtone.connect(overGain);
        overGain.connect(gain);
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);

        osc.start(now);
        overtone.start(now);
        osc.stop(now + 0.36);
        overtone.stop(now + 0.36);
      }

      const bassNote = bass[idx];
      if (bassNote > 0) {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bassNote, now);
        bOsc.connect(bGain);
        bGain.connect(ctx.destination);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.linearRampToValueAtTime(0.024, now + 0.03);
        bGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
        bOsc.start(now);
        bOsc.stop(now + 0.68);
      }
    }, activeTrack.stepMs || 240);
  }

  stopBgmLoop() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  getLullabyInfo() {
    const spec = LULLABY_MELODIES[this.lullabyMelodyId] || LULLABY_MELODIES.star_lullaby;
    return {
      active: Boolean(this.lullabyActive),
      muted: Boolean(this.lullabyMuted || this.muted),
      chimeMuted: Boolean(this.lullabyMuted),
      melodyId: spec.id,
      melodyName: spec.name,
      chimeCount: this.lullabyChimeCount
    };
  }

  playLullabyNote(freq, padFreq = 0, harmonicMult = 2) {
    this.lullabyChimeCount += 1;
    if (this.muted || this.lullabyMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      const mainGain = ctx.createGain();

      osc.type = 'sine';
      bell.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      bell.frequency.setValueAtTime(freq * harmonicMult, now);

      bellGain.gain.setValueAtTime(0.14, now);
      bellGain.gain.exponentialRampToValueAtTime(0.002, now + 0.34);

      osc.connect(mainGain);
      bell.connect(bellGain);
      bellGain.connect(mainGain);
      mainGain.connect(ctx.destination);

      mainGain.gain.setValueAtTime(0.0008, now);
      mainGain.gain.linearRampToValueAtTime(0.028, now + 0.024);
      mainGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.76);

      osc.start(now);
      bell.start(now);
      osc.stop(now + 0.78);
      bell.stop(now + 0.78);
    }
    if (padFreq > 0) {
      const pOsc = ctx.createOscillator();
      const pGain = ctx.createGain();
      pOsc.type = 'sine';
      pOsc.frequency.setValueAtTime(padFreq, now);
      pOsc.connect(pGain);
      pGain.connect(ctx.destination);
      pGain.gain.setValueAtTime(0.0006, now);
      pGain.gain.linearRampToValueAtTime(0.016, now + 0.06);
      pGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.92);
      pOsc.start(now);
      pOsc.stop(now + 0.95);
    }
  }

  startLullabyBox(melodyId = '') {
    if (this.radioActive) {
      this.stopCozyRadio();
    }
    if (melodyId && LULLABY_MELODIES[melodyId]) {
      this.lullabyMelodyId = melodyId;
    }
    this.stopLullabyBox();
    this.lullabyActive = true;
    this.lullabyStep = 0;
    const spec = LULLABY_MELODIES[this.lullabyMelodyId] || LULLABY_MELODIES.star_lullaby;
    this.ensureContext();
    this.playLullabyNote(spec.notes[0], spec.pad[0] || 0, spec.harmonicMult || 2);
    this.lullabyStep = 1;
    this.lullabyTimer = setInterval(() => {
      if (!this.lullabyActive || document.hidden) return;
      const curSpec = LULLABY_MELODIES[this.lullabyMelodyId] || LULLABY_MELODIES.star_lullaby;
      const idx = this.lullabyStep % curSpec.notes.length;
      this.lullabyStep += 1;
      const n = curSpec.notes[idx] || 0;
      const p = curSpec.pad[idx % curSpec.pad.length] || 0;
      if (n > 0 || p > 0) {
        this.playLullabyNote(n, p, curSpec.harmonicMult || 2);
      }
    }, spec.stepMs || 380);
    return this.getLullabyInfo();
  }

  setLullabyMelody(melodyId) {
    if (!LULLABY_MELODIES[melodyId]) return this.getLullabyInfo();
    this.lullabyMelodyId = melodyId;
    const spec = LULLABY_MELODIES[melodyId];
    if (this.lullabyActive) {
      return this.startLullabyBox(melodyId);
    }
    this.ensureContext();
    this.playLullabyNote(spec.notes[0], spec.pad[0] || 0, spec.harmonicMult || 2);
    return this.getLullabyInfo();
  }

  setLullabyMuted(flag) {
    this.lullabyMuted = Boolean(flag);
    if (!this.lullabyMuted) {
      const spec = LULLABY_MELODIES[this.lullabyMelodyId] || LULLABY_MELODIES.star_lullaby;
      this.ensureContext();
      this.playLullabyNote(spec.notes[0], 0, spec.harmonicMult || 2);
    }
    return this.getLullabyInfo();
  }

  toggleLullabyMute() {
    return this.setLullabyMuted(!this.lullabyMuted);
  }

  stopLullabyBox() {
    if (this.lullabyTimer) {
      clearInterval(this.lullabyTimer);
      this.lullabyTimer = null;
    }
    this.lullabyActive = false;
    return this.getLullabyInfo();
  }

  // AR-7 窗畔温暖轻电台：3波段 WebAudio 程序化轻原声/檐雨暖铃/篝火电钢合成引擎
  getCozyRadioInfo() {
    const spec = COZY_RADIO_CHANNELS[this.radioChannelId] || COZY_RADIO_CHANNELS.ch01_guitar;
    return {
      active: Boolean(this.radioActive),
      muted: Boolean(this.muted),
      channelId: spec.id,
      channelCode: spec.code,
      channelName: spec.name,
      shortName: spec.shortName,
      freqLabel: spec.freqLabel,
      synthStyle: spec.synthStyle,
      noteCount: this.radioNoteCount,
      webAudioNodes: this.radioWebAudioNodes,
      channelCounts: { ...this.radioChannelCounts }
    };
  }

  ensureWarmNoiseBuffer(ctx) {
    if (this.noiseBuffer || !ctx) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * 0.55);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = lastOut * 2.2;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  playRadioStep(channelId, stepIdx = 0) {
    const spec = COZY_RADIO_CHANNELS[channelId] || COZY_RADIO_CHANNELS.ch01_guitar;
    this.radioNoteCount += 1;
    this.radioChannelCounts[spec.id] = (this.radioChannelCounts[spec.id] || 0) + 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (spec.synthStyle === 'acoustic_guitar') {
      const nIdx = stepIdx % spec.notes.length;
      const freq = spec.notes[nIdx] || 0;
      const bassFreq = spec.bass[nIdx % spec.bass.length] || 0;
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const bodyOsc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        bodyOsc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        bodyOsc.frequency.setValueAtTime(freq * 2, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1420, now);
        filter.frequency.exponentialRampToValueAtTime(460, now + 0.36);

        const bodyGain = ctx.createGain();
        bodyGain.gain.setValueAtTime(0.16, now);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(filter);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.0008, now);
        gain.gain.linearRampToValueAtTime(0.036, now + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0007, now + 0.44);

        osc.start(now);
        bodyOsc.start(now);
        osc.stop(now + 0.46);
        bodyOsc.stop(now + 0.46);
        this.radioWebAudioNodes += 2;
      }
      if (bassFreq > 0) {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bassFreq, now);
        bOsc.connect(bGain);
        bGain.connect(ctx.destination);
        bGain.gain.setValueAtTime(0.0008, now);
        bGain.gain.linearRampToValueAtTime(0.024, now + 0.025);
        bGain.gain.exponentialRampToValueAtTime(0.0007, now + 0.68);
        bOsc.start(now);
        bOsc.stop(now + 0.7);
        this.radioWebAudioNodes += 1;
      }
    } else if (spec.synthStyle === 'rain_bell') {
      const noiseBuf = this.ensureWarmNoiseBuffer(ctx);
      if (noiseBuf) {
        const rainSrc = ctx.createBufferSource();
        const rainFilter = ctx.createBiquadFilter();
        const rainGain = ctx.createGain();
        rainSrc.buffer = noiseBuf;
        rainFilter.type = 'bandpass';
        rainFilter.frequency.setValueAtTime(720 + (stepIdx % 3) * 80, now);
        rainFilter.Q.setValueAtTime(0.95, now);
        rainSrc.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(ctx.destination);
        rainGain.gain.setValueAtTime(0.001, now);
        rainGain.gain.linearRampToValueAtTime(0.016, now + 0.08);
        rainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        rainSrc.start(now);
        rainSrc.stop(now + 0.44);
        this.radioWebAudioNodes += 1;
      }
      const nIdx = stepIdx % spec.notes.length;
      const bellFreq = spec.notes[nIdx] || 0;
      const padFreq = spec.bass[nIdx % spec.bass.length] || 0;
      if (bellFreq > 0) {
        const bell = ctx.createOscillator();
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        const mainGain = ctx.createGain();
        bell.type = 'sine';
        shimmer.type = 'sine';
        bell.frequency.setValueAtTime(bellFreq, now);
        shimmer.frequency.setValueAtTime(bellFreq * 2.5, now);
        shimmerGain.gain.setValueAtTime(0.11, now);
        shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        bell.connect(mainGain);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(mainGain);
        mainGain.connect(ctx.destination);
        mainGain.gain.setValueAtTime(0.0008, now);
        mainGain.gain.linearRampToValueAtTime(0.026, now + 0.02);
        mainGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.66);
        bell.start(now);
        shimmer.start(now);
        bell.stop(now + 0.68);
        shimmer.stop(now + 0.68);
        this.radioWebAudioNodes += 2;
      }
      if (padFreq > 0) {
        const pOsc = ctx.createOscillator();
        const pGain = ctx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(padFreq, now);
        pOsc.connect(pGain);
        pGain.connect(ctx.destination);
        pGain.gain.setValueAtTime(0.0006, now);
        pGain.gain.linearRampToValueAtTime(0.015, now + 0.06);
        pGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.82);
        pOsc.start(now);
        pOsc.stop(now + 0.84);
        this.radioWebAudioNodes += 1;
      }
    } else if (spec.synthStyle === 'hearth_rhodes') {
      const noiseBuf = this.ensureWarmNoiseBuffer(ctx);
      if (noiseBuf && stepIdx % 2 === 0) {
        const emberSrc = ctx.createBufferSource();
        const emberFilter = ctx.createBiquadFilter();
        const emberGain = ctx.createGain();
        emberSrc.buffer = noiseBuf;
        emberFilter.type = 'bandpass';
        emberFilter.frequency.setValueAtTime(1180 + (stepIdx % 4) * 140, now);
        emberFilter.Q.setValueAtTime(2.6, now);
        emberSrc.connect(emberFilter);
        emberFilter.connect(emberGain);
        emberGain.connect(ctx.destination);
        emberGain.gain.setValueAtTime(0.001, now);
        emberGain.gain.linearRampToValueAtTime(0.013, now + 0.016);
        emberGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
        emberSrc.start(now);
        emberSrc.stop(now + 0.16);
        this.radioWebAudioNodes += 1;
      }
      const chord = spec.chords[stepIdx % spec.chords.length] || [0];
      chord.forEach((freq, idx) => {
        if (!freq || freq <= 0) return;
        const rhodes = ctx.createOscillator();
        const tine = ctx.createOscillator();
        const tineGain = ctx.createGain();
        const gain = ctx.createGain();
        const offset = idx * 0.018;
        rhodes.type = 'sine';
        tine.type = 'triangle';
        rhodes.frequency.setValueAtTime(freq, now + offset);
        tine.frequency.setValueAtTime(freq * 2, now + offset);
        tineGain.gain.setValueAtTime(0.08, now + offset);
        tineGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
        rhodes.connect(gain);
        tine.connect(tineGain);
        tineGain.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.0006, now + offset);
        gain.gain.linearRampToValueAtTime(0.018, now + offset + 0.028);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + offset + 0.74);
        rhodes.start(now + offset);
        tine.start(now + offset);
        rhodes.stop(now + offset + 0.76);
        tine.stop(now + offset + 0.76);
        this.radioWebAudioNodes += 2;
      });
    }
  }

  startCozyRadio(channelId = '') {
    if (channelId && COZY_RADIO_CHANNELS[channelId]) {
      this.radioChannelId = channelId;
    }
    if (this.lullabyActive) {
      this.stopLullabyBox();
    }
    this.stopCozyRadio();
    this.radioActive = true;
    this.radioStep = 0;
    const spec = COZY_RADIO_CHANNELS[this.radioChannelId] || COZY_RADIO_CHANNELS.ch01_guitar;
    this.ensureContext();
    this.playRadioStep(spec.id, 0);
    this.radioStep = 1;
    this.radioTimer = setInterval(() => {
      if (!this.radioActive || document.hidden) return;
      const curSpec = COZY_RADIO_CHANNELS[this.radioChannelId] || COZY_RADIO_CHANNELS.ch01_guitar;
      const stepNow = this.radioStep;
      this.radioStep += 1;
      this.playRadioStep(curSpec.id, stepNow);
    }, spec.stepMs || 320);
    return this.getCozyRadioInfo();
  }

  setCozyRadioChannel(channelId) {
    if (!COZY_RADIO_CHANNELS[channelId]) return this.getCozyRadioInfo();
    this.radioChannelId = channelId;
    this.playSfx('radio_tune');
    if (this.radioActive) {
      return this.startCozyRadio(channelId);
    }
    this.ensureContext();
    this.playRadioStep(channelId, 0);
    return this.getCozyRadioInfo();
  }

  stopCozyRadio() {
    if (this.radioTimer) {
      clearInterval(this.radioTimer);
      this.radioTimer = null;
    }
    this.radioActive = false;
    return this.getCozyRadioInfo();
  }

  toggleCozyRadio(channelId = '') {
    if (this.radioActive) {
      return this.stopCozyRadio();
    }
    return this.startCozyRadio(channelId || this.radioChannelId);
  }

  // 二次元萌系角色气泡音 + 少女感短句 TTS 配音
  speakVoice(rawText, mood = 'happy', forceSpeak = false) {
    if (this.muted || !this.voiceEnabled) return;
    const nowMs = performance.now();
    if (!forceSpeak && nowMs - this.lastVoiceTime < 950) return;
    this.lastVoiceTime = nowMs;

    const ctx = this.ensureContext();
    if (ctx) {
      // 1. 零延迟二次元少女气泡音节（类似蔚蓝档案/动森萌系元音共振峰）
      const presets = {
        happy: [580, 740, 880],
        tsundere: [660, 540, 790, 620],
        eat: [520, 660, 590],
        surprise: [540, 860, 1020],
        sleep: [420, 370],
        cheer: [640, 820, 1046, 1174]
      };
      const notes = presets[mood] || presets.happy;
      const t0 = ctx.currentTime;
      notes.forEach((freq, i) => {
        const start = t0 + i * 0.068;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.94, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, start + 0.055);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.1, start);
        filter.Q.setValueAtTime(2.4, start);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.075, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.064);

        osc.start(start);
        osc.stop(start + 0.068);
      });
    }

    // 2. 若系统支持中文女声 Web Speech，则在关键互动时朗读精简萌系台词
    if (forceSpeak && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const cleanText = String(rawText || '')
          .replace(/[\p{Extended_Pictographic}\uFE0F\u200D>\/<^=w_~♪]/gu, '')
          .replace(/zzZ/gi, '呼呼')
          .trim();
        if (cleanText.length >= 2 && cleanText.length <= 18) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(cleanText);
          utter.lang = 'zh-CN';
          if (this.zhVoice) utter.voice = this.zhVoice;
          utter.pitch = 1.48;
          utter.rate = 1.14;
          utter.volume = 0.68;
          window.speechSynthesis.speak(utter);
        }
      } catch (e) {}
    }
  }

  playSfx(type, combo = 1) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(290, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.13);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'climb') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.11);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'pat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(510, now);
      osc.frequency.setValueAtTime(720, now + 0.06);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'boop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.09);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'purr') {
      const pitch = Math.min(880, 480 + combo * 28);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.24, now + 0.14);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.165);
    } else if (type === 'pickup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.13);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.145);
    } else if (type === 'shutter') {
      // 清脆拍立得快门咔嚓 + 星光闪烁音
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.055);

      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, now + 0.06);
      chime.frequency.setValueAtTime(1318.5, now + 0.12);
      chime.frequency.setValueAtTime(1567.98, now + 0.18);
      chime.connect(cGain);
      cGain.connect(ctx.destination);
      cGain.gain.setValueAtTime(0.09, now + 0.06);
      cGain.gain.exponentialRampToValueAtTime(0.004, now + 0.34);
      chime.start(now + 0.06);
      chime.stop(now + 0.35);
    } else if (type === 'rps_tick') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440 + combo * 110, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (type === 'bite') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(430, now);
      osc.frequency.setValueAtTime(590, now + 0.05);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'bounce') {
      const pitch = Math.min(980, 340 + combo * 55);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.45, now + 0.12);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.13);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'quack') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.linearRampToValueAtTime(390, now + 0.09);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'shoot') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);
      gain.gain.setValueAtTime(0.032, now);
      gain.gain.linearRampToValueAtTime(0.004, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'star') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.07);
      osc.frequency.setValueAtTime(783.99, now + 0.14);
      osc.frequency.setValueAtTime(1046.5, now + 0.21);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.34);
      osc.start(now);
      osc.stop(now + 0.34);
    } else if (type === 'water_drop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.11);
      gain.gain.setValueAtTime(0.095, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.145);
    } else if (type === 'celesta_chime') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(698.46, now);
      osc.frequency.setValueAtTime(880.0, now + 0.08);
      osc.frequency.setValueAtTime(1046.5, now + 0.16);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.003, now + 0.44);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'sticker_pop') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.085);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.115);
    } else if (type === 'radio_tune') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.linearRampToValueAtTime(680, now + 0.06);
      osc.frequency.linearRampToValueAtTime(590, now + 0.12);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.145);
    } else if (type === 'crochet_stitch') {
      this.crochetStitchCount += 1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.055);
      osc.frequency.setValueAtTime(783.99, now + 0.11);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'cocoa_clink') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174.66, now);
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12);
      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.003, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.145);
      this.cocoaWebAudioNodes += 1;
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else {
      osc.stop(now);
    }
  }

  playCocoaServeChime(variant = 0) {
    this.cocoaChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 暖瓷马克杯轻碰清脆铃音（陶瓷高频泛音）
    const clinkOsc = ctx.createOscillator();
    const clinkHarm = ctx.createOscillator();
    const clinkGain = ctx.createGain();
    const baseBell = 1318.51 + (Number(variant) % 3) * 88;
    clinkOsc.type = 'sine';
    clinkHarm.type = 'triangle';
    clinkOsc.frequency.setValueAtTime(baseBell, now);
    clinkOsc.frequency.exponentialRampToValueAtTime(baseBell * 0.96, now + 0.18);
    clinkHarm.frequency.setValueAtTime(baseBell * 2.42, now);
    clinkOsc.connect(clinkGain);
    clinkHarm.connect(clinkGain);
    clinkGain.connect(ctx.destination);
    clinkGain.gain.setValueAtTime(0.001, now);
    clinkGain.gain.linearRampToValueAtTime(0.075, now + 0.008);
    clinkGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
    clinkOsc.start(now);
    clinkHarm.start(now);
    clinkOsc.stop(now + 0.23);
    clinkHarm.stop(now + 0.16);
    this.cocoaWebAudioNodes += 2;

    // 2. 棉花糖融化暖意琶音和弦（Fmaj7 柔暖三音阶）
    const warmNotes = [523.25, 659.25, 783.99, 1046.5];
    warmNotes.forEach((freq, idx) => {
      const wOsc = ctx.createOscillator();
      const wGain = ctx.createGain();
      const t0 = now + 0.055 + idx * 0.055;
      wOsc.type = idx === warmNotes.length - 1 ? 'sine' : 'triangle';
      wOsc.frequency.setValueAtTime(freq, t0);
      wOsc.connect(wGain);
      wGain.connect(ctx.destination);
      wGain.gain.setValueAtTime(0.0008, t0);
      wGain.gain.linearRampToValueAtTime(0.052, t0 + 0.018);
      wGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.36);
      wOsc.start(t0);
      wOsc.stop(t0 + 0.38);
      this.cocoaWebAudioNodes += 1;
    });
  }

  getAr8AudioInfo() {
    return {
      cocoaChimeCount: this.cocoaChimeCount,
      cocoaWebAudioNodes: this.cocoaWebAudioNodes,
      crochetStitchCount: this.crochetStitchCount
    };
  }
}

export const petAudio = new PetAudioAndHaptics();
