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

// AR-15 窗边听雨角白噪音预设：按窗外天气选滤波 / 音量，并按确定性步长点缀檐滴 / 风铃 / 远雷
const RAIN_NOISE_PRESETS = {
  drizzle: { filter: 'lowpass', freq: 1500, q: 0.5, gain: 0.05, dripEvery: 4, chimeEvery: 9, rumbleEvery: 0 },
  eaves: { filter: 'bandpass', freq: 900, q: 0.7, gain: 0.035, dripEvery: 1, chimeEvery: 11, rumbleEvery: 0 },
  shower: { filter: 'lowpass', freq: 2600, q: 0.4, gain: 0.07, dripEvery: 3, chimeEvery: 13, rumbleEvery: 0 },
  thunder: { filter: 'lowpass', freq: 1100, q: 0.6, gain: 0.05, dripEvery: 5, chimeEvery: 12, rumbleEvery: 11 },
  breeze: { filter: 'bandpass', freq: 620, q: 0.5, gain: 0.025, dripEvery: 6, chimeEvery: 2, rumbleEvery: 0 }
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
    this.pagePressCount = 0;
    this.stargazeNoteCount = 0;
    this.stargazeChimeCount = 0;
    this.stargazeWebAudioNodes = 0;
    this.brushStrokeCount = 0;
    this.paintFinishChimeCount = 0;
    this.letterOpenCount = 0;
    this.letterSentChimeCount = 0;
    this.ar10WebAudioNodes = 0;
    this.bentoPlaceCount = 0;
    this.bentoLidChimeCount = 0;
    this.bentoRescueChimeCount = 0;
    this.puzzleSnapCount = 0;
    this.puzzleCompleteChimeCount = 0;
    this.ar11WebAudioNodes = 0;
    this.kittenMewCount = 0;
    this.kittenPurrCount = 0;
    this.kittenCrunchCount = 0;
    this.cardSnipCount = 0;
    this.cardSendChimeCount = 0;
    this.kittenLuckChimeCount = 0;
    this.ar12WebAudioNodes = 0;
    this.picnicPackCount = 0;
    this.picnicSpreadCount = 0;
    this.picnicShareCount = 0;
    this.picnicFinishCount = 0;
    this.diaryFlipCount = 0;
    this.diaryStickerCount = 0;
    this.diaryScribbleCount = 0;
    this.ar13WebAudioNodes = 0;
    this.potteryWheelCount = 0;
    this.potteryGlazeCount = 0;
    this.potteryKilnCount = 0;
    this.potteryDoneCount = 0;
    this.aromaDropCount = 0;
    this.aromaLightCount = 0;
    this.ar14WebAudioNodes = 0;
    this.starDialCount = 0;
    this.starProjectCount = 0;
    this.starDreamCount = 0;
    this.rainActive = false;
    this.rainWeatherId = 'drizzle';
    this.rainVolume = 1;
    this.rainChimeOn = true;
    this.rainTimer = null;
    this.rainStep = 0;
    this.rainNodes = null;
    this.rainStartCount = 0;
    this.rainStopCount = 0;
    this.rainLoopCount = 0;
    this.rainTickCount = 0;
    this.rainDripCount = 0;
    this.rainChimeCount = 0;
    this.rainRumbleCount = 0;
    this.ar15WebAudioNodes = 0;
    this.embroideryStitchCount = 0;
    this.embroideryHangCount = 0;
    this.hearthCrackleCount = 0;
    this.hearthKindleCount = 0;
    this.snackFlipCount = 0;
    this.snackShareCount = 0;
    this.ar16WebAudioNodes = 0;
    this.rainNoiseBuffer = null;
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
      // AR-15 静音时白噪音循环一并收起（听雨状态保留，取消静音后接着播）
      this.teardownRainLoop();
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    } else {
      this.ensureContext();
      this.playSfx('pat');
      if (this.rainActive && !this.rainNodes) this.buildRainLoop();
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
    } else if (type === 'page_press') {
      // 压花册合页：低柔纸页轻按 + 上扬木质三音
      this.pagePressCount += 1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392.0, now);
      osc.frequency.setValueAtTime(493.88, now + 0.06);
      osc.frequency.setValueAtTime(587.33, now + 0.12);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.003, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.27);
    } else if (type === 'telescope_focus') {
      // 望远镜对焦：柔和上滑正弦
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.18);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.003, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.25);
      this.stargazeWebAudioNodes += 1;
    } else if (type === 'star_miss') {
      // 认错星星：轻轻的低音“嗯？”，不刺耳
      osc.type = 'sine';
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.exponentialRampToValueAtTime(311.13, now + 0.12);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (type === 'paint_mix') {
      // AR-10 调色：笔尖在颜料井里轻搅的两声水润“啵”
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440.0, now);
      osc.frequency.exponentialRampToValueAtTime(660.0, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
      this.ar10WebAudioNodes += 1;
    } else if (type === 'bento_place') {
      // AR-11 摆便当：木盒里轻轻放下食材的软糯“嗒”+ 一声上扬
      this.bentoPlaceCount += 1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.09);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.19);
      this.ar11WebAudioNodes += 1;
    } else if (type === 'puzzle_pick') {
      // AR-11 拿起拼图块：纸片轻弹的短促高音
      osc.type = 'sine';
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.05);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
      this.ar11WebAudioNodes += 1;
    } else if (type === 'stamp_press') {
      // AR-10 贴邮票：软木轻按的低柔“咚”+ 上扬回音
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, now);
      osc.frequency.setValueAtTime(392.0, now + 0.07);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
      this.ar10WebAudioNodes += 1;
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

  // AR-9 连星音符：C 大调五声音阶钢片琴，每连一颗星升一个音
  playStarLinkNote(index = 0) {
    this.stargazeNoteCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = scale[Math.max(0, Math.round(Number(index) || 0)) % scale.length];
    const osc = ctx.createOscillator();
    const harm = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    harm.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    harm.frequency.setValueAtTime(freq * 2, now);
    osc.connect(gain);
    harm.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);
    osc.start(now);
    harm.start(now);
    osc.stop(now + 0.44);
    harm.stop(now + 0.22);
    this.stargazeWebAudioNodes += 2;
  }

  // AR-9 星座收录：柔暖琶音 + 高处星光泛音（variant 对应 6 座星座的不同起始音）
  playStargazeChime(variant = 0) {
    this.stargazeChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    const ratios = [1, 1.25, 1.5, 2, 2.5];
    ratios.forEach((r, idx) => {
      const nOsc = ctx.createOscillator();
      const nGain = ctx.createGain();
      const t0 = now + idx * 0.07;
      nOsc.type = idx === ratios.length - 1 ? 'sine' : 'triangle';
      nOsc.frequency.setValueAtTime(root * r, t0);
      nOsc.connect(nGain);
      nGain.connect(ctx.destination);
      nGain.gain.setValueAtTime(0.0008, t0);
      nGain.gain.linearRampToValueAtTime(0.05, t0 + 0.016);
      nGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.5);
      nOsc.start(t0);
      nOsc.stop(t0 + 0.52);
      this.stargazeWebAudioNodes += 1;
    });
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const ts = now + ratios.length * 0.07;
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(root * 4, ts);
    shimmer.frequency.exponentialRampToValueAtTime(root * 3.75, ts + 0.6);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerGain.gain.setValueAtTime(0.0008, ts);
    shimmerGain.gain.linearRampToValueAtTime(0.028, ts + 0.03);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0006, ts + 0.7);
    shimmer.start(ts);
    shimmer.stop(ts + 0.72);
    this.stargazeWebAudioNodes += 1;
  }

  // AR-10 晕染笔触：柔和下滑正弦 + 轻微泛音，每笔音高略有不同
  playBrushStroke(index = 0) {
    this.brushStrokeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [659.25, 587.33, 698.46, 783.99];
    const freq = roots[Math.abs(Math.round(Number(index) || 0)) % roots.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.36);
    osc.start(now);
    osc.stop(now + 0.38);
    this.ar10WebAudioNodes += 1;
  }

  // AR-10 落款挂画：温柔大三和弦琶音（variant 对应 3 种调色盘起始音）
  playPaintingFinishChime(variant = 0) {
    this.paintFinishChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33, 659.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.25, 1.5, 2].forEach((r, idx) => {
      const nOsc = ctx.createOscillator();
      const nGain = ctx.createGain();
      const t0 = now + idx * 0.08;
      nOsc.type = idx === 3 ? 'sine' : 'triangle';
      nOsc.frequency.setValueAtTime(root * r, t0);
      nOsc.connect(nGain);
      nGain.connect(ctx.destination);
      nGain.gain.setValueAtTime(0.0008, t0);
      nGain.gain.linearRampToValueAtTime(0.048, t0 + 0.018);
      nGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.48);
      nOsc.start(t0);
      nOsc.stop(t0 + 0.5);
      this.ar10WebAudioNodes += 1;
    });
  }

  // AR-10 拆信：纸页沙沙（短促噪声经带通滤波），无噪声缓冲时退化为柔和正弦
  playLetterOpen() {
    this.letterOpenCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buf = this.ensureWarmNoiseBuffer(ctx);
    if (buf) {
      const src = ctx.createBufferSource();
      const band = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = buf;
      band.type = 'bandpass';
      band.frequency.setValueAtTime(2600, now);
      band.Q.setValueAtTime(0.9, now);
      src.connect(band);
      band.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0008, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);
      src.start(now);
      src.stop(now + 0.26);
      this.ar10WebAudioNodes += 1;
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.0, now);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
      this.ar10WebAudioNodes += 1;
    }
  }

  // AR-10 寄出回信：两声邮铃 + 一缕高处泛音
  playLetterSentChime(variant = 0) {
    this.letterSentChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bell = 1046.5 + (Math.abs(Math.round(Number(variant) || 0)) % 3) * 58;
    [0, 0.14].forEach((dt, idx) => {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      const t0 = now + dt;
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(idx === 0 ? bell : bell * 1.26, t0);
      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bGain.gain.setValueAtTime(0.0008, t0);
      bGain.gain.linearRampToValueAtTime(0.055, t0 + 0.01);
      bGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.42);
      bOsc.start(t0);
      bOsc.stop(t0 + 0.44);
      this.ar10WebAudioNodes += 1;
    });
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const ts = now + 0.3;
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(bell * 2, ts);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerGain.gain.setValueAtTime(0.0008, ts);
    shimmerGain.gain.linearRampToValueAtTime(0.022, ts + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0006, ts + 0.5);
    shimmer.start(ts);
    shimmer.stop(ts + 0.52);
    this.ar10WebAudioNodes += 1;
  }

  // AR-11 盖上便当盖：木盒合拢的低柔一声 + 温暖大三和弦（variant 对应 3 种饭团馅料）
  playBentoLidChime(variant = 0) {
    this.bentoLidChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [440.0, 493.88, 523.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(196.0, now);
    thud.frequency.exponentialRampToValueAtTime(130.81, now + 0.12);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudGain.gain.setValueAtTime(0.07, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    thud.start(now);
    thud.stop(now + 0.17);
    this.ar11WebAudioNodes += 1;
    [1, 1.26, 1.5].forEach((r, idx) => {
      const nOsc = ctx.createOscillator();
      const nGain = ctx.createGain();
      const t0 = now + 0.12 + idx * 0.07;
      nOsc.type = 'sine';
      nOsc.frequency.setValueAtTime(root * r, t0);
      nOsc.connect(nGain);
      nGain.connect(ctx.destination);
      nGain.gain.setValueAtTime(0.0008, t0);
      nGain.gain.linearRampToValueAtTime(0.045, t0 + 0.02);
      nGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.42);
      nOsc.start(t0);
      nOsc.stop(t0 + 0.44);
      this.ar11WebAudioNodes += 1;
    });
  }

  // AR-11 打工中饭团救急：两声轻快上行音 + 一缕泛音
  playBentoRescueChime() {
    this.bentoRescueChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.08;
      o.type = idx === 2 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(idx === 2 ? 0.025 : 0.05, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.3);
      o.start(t0);
      o.stop(t0 + 0.32);
      this.ar11WebAudioNodes += 1;
    });
  }

  // AR-11 交换拼图块：归位越多音越亮（landed 0~2），步数让音高轻微起伏
  playPuzzleSnap(landed = 0, moves = 0) {
    this.puzzleSnapCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = [392.0, 523.25, 659.25][Math.max(0, Math.min(2, Math.round(Number(landed) || 0)))];
    const wobble = 1 + ((Math.abs(Math.round(Number(moves) || 0)) % 4) - 1.5) * 0.012;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(base * wobble, now);
    o.frequency.exponentialRampToValueAtTime(base * wobble * 1.5, now + 0.06);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
    o.start(now);
    o.stop(now + 0.22);
    this.ar11WebAudioNodes += 1;
  }

  // AR-11 拼图完成：五声音阶琶音（variant 对应 拍立得 / 水彩 / 周报 / 原画）
  playPuzzleCompleteChime(variant = 0) {
    this.puzzleCompleteChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33, 493.88, 440.0];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.125, 1.25, 1.5, 2].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.075;
      o.type = idx === 4 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.042, t0 + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.46);
      o.start(t0);
      o.stop(t0 + 0.48);
      this.ar11WebAudioNodes += 1;
    });
  }

  // AR-12 窗台小猫来访：两声软软的上扬“喵”（正弦滑音 + 轻微颤音），variant 对应橘猫 / 奶牛猫
  playKittenMew(variant = 0) {
    this.kittenMewCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = [698.46, 622.25][Math.abs(Math.round(Number(variant) || 0)) % 2];
    [0, 0.2].forEach((offset, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const t0 = now + offset;
      const f0 = base * (idx === 0 ? 1 : 1.12);
      o.type = 'sine';
      o.frequency.setValueAtTime(f0 * 0.82, t0);
      o.frequency.exponentialRampToValueAtTime(f0 * 1.18, t0 + 0.08);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t0 + 0.2);
      vib.type = 'sine';
      vib.frequency.setValueAtTime(18, t0);
      vibGain.gain.setValueAtTime(f0 * 0.02, t0);
      vib.connect(vibGain);
      vibGain.connect(o.frequency);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.22);
      o.start(t0);
      o.stop(t0 + 0.24);
      vib.start(t0);
      vib.stop(t0 + 0.24);
      this.ar12WebAudioNodes += 2;
    });
  }

  // AR-12 摸摸小猫：低柔的呼噜颤音（低频三角波 + 慢速振幅起伏）
  playKittenPurr() {
    this.kittenPurrCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(92, now);
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(24, now);
    lfoGain.gain.setValueAtTime(0.022, now);
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.03, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.62);
    o.start(now);
    o.stop(now + 0.64);
    lfo.start(now);
    lfo.stop(now + 0.64);
    this.ar12WebAudioNodes += 2;
  }

  // AR-12 添猫粮：颗粒落进陶碗的三下轻脆“嗒嗒嗒”
  playKittenCrunch() {
    this.kittenCrunchCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.07, 0.15].forEach((offset, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + offset;
      o.type = 'triangle';
      o.frequency.setValueAtTime(1046.5 - idx * 110, t0);
      o.frequency.exponentialRampToValueAtTime(660 - idx * 60, t0 + 0.05);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.07);
      o.start(t0);
      o.stop(t0 + 0.08);
      this.ar12WebAudioNodes += 1;
    });
  }

  // AR-12 剪贴贺卡：剪刀“咔嚓”一下的短促双音（idx 让每枚贴纸音高略有不同）
  playCardSnip(idx = 0) {
    this.cardSnipCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const lift = 1 + (Math.abs(Math.round(Number(idx) || 0)) % 4) * 0.06;
    [0, 0.05].forEach((offset, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + offset;
      o.type = 'square';
      o.frequency.setValueAtTime((i === 0 ? 1318.5 : 1567.98) * lift, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.012, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.04);
      o.start(t0);
      o.stop(t0 + 0.05);
      this.ar12WebAudioNodes += 1;
    });
  }

  // AR-12 寄出贺卡：信封合上的低柔一声 + 温暖琶音（variant 对应季节 / 节日）
  playCardSendChime(variant = 0) {
    this.cardSendChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33, 659.25, 493.88, 440.0, 392.0, 554.37, 622.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.25, 1.5, 2].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.06 + idx * 0.08;
      o.type = idx === 3 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.5);
      o.start(t0);
      o.stop(t0 + 0.52);
      this.ar12WebAudioNodes += 1;
    });
  }

  // AR-12 打工中九命护身：一串上行的软铃音
  playKittenLuckChime() {
    this.kittenLuckChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [659.25, 783.99, 987.77, 1318.5].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.07;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.34);
      o.start(t0);
      o.stop(t0 + 0.36);
      this.ar12WebAudioNodes += 1;
    });
  }

  getAr12AudioInfo() {
    return {
      kittenMewCount: this.kittenMewCount,
      kittenPurrCount: this.kittenPurrCount,
      kittenCrunchCount: this.kittenCrunchCount,
      cardSnipCount: this.cardSnipCount,
      cardSendChimeCount: this.cardSendChimeCount,
      kittenLuckChimeCount: this.kittenLuckChimeCount,
      ar12WebAudioNodes: this.ar12WebAudioNodes
    };
  }

  // AR-13 装野餐篮：藤编篮扣“咔哒”两下 + 一声软软的木质低音（idx 让每样点心音高略有不同）
  playPicnicPack(idx = 0) {
    this.picnicPackCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const lift = 1 + (Math.abs(Math.round(Number(idx) || 0)) % 4) * 0.05;
    [0, 0.06].forEach((offset, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + offset;
      o.type = 'triangle';
      o.frequency.setValueAtTime((i === 0 ? 880 : 1174.66) * lift, t0);
      o.frequency.exponentialRampToValueAtTime((i === 0 ? 620 : 830) * lift, t0 + 0.04);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.06);
      o.start(t0);
      o.stop(t0 + 0.07);
      this.ar13WebAudioNodes += 1;
    });
    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(196 * lift, now + 0.1);
    body.connect(bg);
    bg.connect(ctx.destination);
    bg.gain.setValueAtTime(0.0008, now + 0.1);
    bg.gain.linearRampToValueAtTime(0.03, now + 0.12);
    bg.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);
    body.start(now + 0.1);
    body.stop(now + 0.34);
    this.ar13WebAudioNodes += 1;
  }

  // AR-13 铺开野餐垫：一阵柔和的布料“呼啦”（暖色噪声带通扫频）+ 一声上扬的风铃
  playPicnicSpread() {
    this.picnicSpreadCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(0.9, now);
      bp.frequency.setValueAtTime(420, now);
      bp.frequency.exponentialRampToValueAtTime(1800, now + 0.32);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);
      src.start(now);
      src.stop(now + 0.45);
      this.ar13WebAudioNodes += 1;
    }
    [1046.5, 1318.5].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.28 + idx * 0.09;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.4);
      o.start(t0);
      o.stop(t0 + 0.42);
      this.ar13WebAudioNodes += 1;
    });
  }

  // AR-13 分享点心：一声圆润的“啊呜”小气泡（正弦下滑 + 上扬尾音）
  playPicnicShare(idx = 0) {
    this.picnicShareCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = [523.25, 587.33, 659.25][Math.abs(Math.round(Number(idx) || 0)) % 3];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * 1.5, now);
    o.frequency.exponentialRampToValueAtTime(base * 0.8, now + 0.09);
    o.frequency.exponentialRampToValueAtTime(base * 1.2, now + 0.18);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
    o.start(now);
    o.stop(now + 0.24);
    this.ar13WebAudioNodes += 1;
  }

  // AR-13 野餐完成：两声清脆鸟鸣 + 一串温暖的大三和弦琶音（variant 对应野餐地点）
  playPicnicFinish(variant = 0) {
    this.picnicFinishCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + offset;
      o.type = 'sine';
      o.frequency.setValueAtTime(2349.32, t0);
      o.frequency.exponentialRampToValueAtTime(3135.96, t0 + 0.05);
      o.frequency.exponentialRampToValueAtTime(2637.02, t0 + 0.1);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.016, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.11);
      o.start(t0);
      o.stop(t0 + 0.12);
      this.ar13WebAudioNodes += 1;
    });
    const roots = [523.25, 440.0, 493.88];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.25, 1.5, 2].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.3 + idx * 0.09;
      o.type = idx === 3 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.04, t0 + 0.016);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.55);
      o.start(t0);
      o.stop(t0 + 0.58);
      this.ar13WebAudioNodes += 1;
    });
  }

  // AR-13 翻日记：纸页翻过的一声轻“沙”（高通暖噪声短促滑过）
  playDiaryFlip() {
    this.diaryFlipCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buffer;
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(900, now);
    hp.frequency.exponentialRampToValueAtTime(2600, now + 0.16);
    src.connect(hp);
    hp.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.06, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
    src.start(now);
    src.stop(now + 0.22);
    this.ar13WebAudioNodes += 1;
  }

  // AR-13 贴日记贴纸：软软的“啪”一下（低频三角波轻拍，idx 让每枚音高略有不同）
  playDiarySticker(idx = 0) {
    this.diaryStickerCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const f = [392.0, 440.0, 493.88, 523.25][Math.abs(Math.round(Number(idx) || 0)) % 4];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f * 1.4, now);
    o.frequency.exponentialRampToValueAtTime(f, now + 0.05);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);
    o.start(now);
    o.stop(now + 0.18);
    this.ar13WebAudioNodes += 1;
  }

  // AR-13 她写日记：铅笔在纸上沙沙划过的几下短促笔触（带通暖噪声颗粒）
  playDiaryScribble() {
    this.diaryScribbleCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (!buffer) return;
    [0, 0.11, 0.2, 0.34].forEach((offset, idx) => {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const t0 = now + offset;
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(2.2, t0);
      bp.frequency.setValueAtTime(2400 + idx * 260, t0);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.08);
      src.start(t0);
      src.stop(t0 + 0.09);
      this.ar13WebAudioNodes += 1;
    });
  }

  getAr13AudioInfo() {
    return {
      picnicPackCount: this.picnicPackCount,
      picnicSpreadCount: this.picnicSpreadCount,
      picnicShareCount: this.picnicShareCount,
      picnicFinishCount: this.picnicFinishCount,
      diaryFlipCount: this.diaryFlipCount,
      diaryStickerCount: this.diaryStickerCount,
      diaryScribbleCount: this.diaryScribbleCount,
      ar13WebAudioNodes: this.ar13WebAudioNodes
    };
  }

  // AR-14 陶艺转盘拉坯：木转盘“呼——”一圈低沉的旋转嗡声（暖色噪声低通 + 一声柔和的陶土闷响，step 让每一圈音高略升）
  playPotteryWheel(step = 0) {
    this.potteryWheelCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const lift = 1 + (Math.abs(Math.round(Number(step) || 0)) % 4) * 0.06;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      lp.type = 'lowpass';
      lp.Q.setValueAtTime(1.4, now);
      lp.frequency.setValueAtTime(260 * lift, now);
      lp.frequency.linearRampToValueAtTime(520 * lift, now + 0.22);
      lp.frequency.linearRampToValueAtTime(300 * lift, now + 0.46);
      src.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.05, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.5);
      src.start(now);
      src.stop(now + 0.52);
      this.ar14WebAudioNodes += 1;
    }
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(174.61 * lift, now + 0.04);
    o.frequency.exponentialRampToValueAtTime(130.81 * lift, now + 0.3);
    o.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.0008, now + 0.04);
    g2.gain.linearRampToValueAtTime(0.035, now + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.0008, now + 0.34);
    o.start(now + 0.04);
    o.stop(now + 0.36);
    this.ar14WebAudioNodes += 1;
  }

  // AR-14 上釉：毛刷蘸釉“刷——”的一下（带通暖噪声滑过）+ 一声清亮的瓷质小叮（variant 对应釉色）
  playPotteryGlaze(variant = 0) {
    this.potteryGlazeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(1.6, now);
      bp.frequency.setValueAtTime(1400, now);
      bp.frequency.exponentialRampToValueAtTime(2600, now + 0.18);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      src.start(now);
      src.stop(now + 0.24);
      this.ar14WebAudioNodes += 1;
    }
    const tones = [1567.98, 1760.0, 1975.53];
    const f = tones[Math.abs(Math.round(Number(variant) || 0)) % tones.length];
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    const t0 = now + 0.16;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t0);
    o.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.0008, t0);
    g2.gain.linearRampToValueAtTime(0.026, t0 + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.42);
    o.start(t0);
    o.stop(t0 + 0.44);
    this.ar14WebAudioNodes += 1;
  }

  // AR-14 入窑烧制：窑火“呼呼”的暖风低吟（低通噪声缓慢起伏）
  playPotteryKiln() {
    this.potteryKilnCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buffer;
    lp.type = 'lowpass';
    lp.Q.setValueAtTime(0.8, now);
    lp.frequency.setValueAtTime(320, now);
    lp.frequency.linearRampToValueAtTime(680, now + 0.6);
    lp.frequency.linearRampToValueAtTime(380, now + 1.3);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.045, now + 0.3);
    g.gain.linearRampToValueAtTime(0.035, now + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 1.4);
    src.start(now);
    src.stop(now + 1.45);
    this.ar14WebAudioNodes += 1;
  }

  // AR-14 陶器出窑：瓷器“叮——”的清脆余韵 + 一串温柔的五声音阶琶音（variant 对应器型）
  playPotteryDone(variant = 0) {
    this.potteryDoneCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [2093.0, 2637.02].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.05;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.022, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.7);
      o.start(t0);
      o.stop(t0 + 0.72);
      this.ar14WebAudioNodes += 1;
    });
    [1, 1.125, 1.25, 1.5, 1.6667].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.22 + idx * 0.08;
      o.type = idx === 4 ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.036, t0 + 0.014);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.5);
      o.start(t0);
      o.stop(t0 + 0.52);
      this.ar14WebAudioNodes += 1;
    });
  }

  // AR-14 滴入精油：一滴圆润的“嘀嗒”（正弦快速下滑的小水滴，idx 让每一滴音高略有不同）
  playAromaDrop(idx = 0) {
    this.aromaDropCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const f = [1318.51, 1174.66, 1046.5, 1396.91][Math.abs(Math.round(Number(idx) || 0)) % 4];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, now);
    o.frequency.exponentialRampToValueAtTime(f, now + 0.05);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.04, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 0.2);
    o.start(now);
    o.stop(now + 0.22);
    this.ar14WebAudioNodes += 1;
  }

  // AR-14 点香：香薰机“噗——”一声轻柔的雾气（高通暖噪声缓慢淡出）+ 两声风铃（variant 对应心情）
  playAromaLight(variant = 0) {
    this.aromaLightCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800, now);
      hp.frequency.exponentialRampToValueAtTime(3600, now + 0.6);
      src.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.7);
      src.start(now);
      src.stop(now + 0.72);
      this.ar14WebAudioNodes += 1;
    }
    const roots = [783.99, 659.25, 698.46, 880.0, 587.33];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.5].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.3 + idx * 0.12;
      o.type = 'sine';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.028, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.6);
      o.start(t0);
      o.stop(t0 + 0.62);
      this.ar14WebAudioNodes += 1;
    });
  }

  getAr14AudioInfo() {
    return {
      potteryWheelCount: this.potteryWheelCount,
      potteryGlazeCount: this.potteryGlazeCount,
      potteryKilnCount: this.potteryKilnCount,
      potteryDoneCount: this.potteryDoneCount,
      aromaDropCount: this.aromaDropCount,
      aromaLightCount: this.aromaLightCount,
      ar14WebAudioNodes: this.ar14WebAudioNodes
    };
  }

  // AR-15 转动星空投影罩：八音盒齿轮“咔嗒”一下 + 一声小小的星光叮（step 越大音越高，对准一颗星升半格）
  playStarDial(step = 0) {
    this.starDialCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(3.2, now);
      bp.frequency.setValueAtTime(2400, now);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.03, now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.06);
      src.start(now);
      src.stop(now + 0.07);
      this.ar15WebAudioNodes += 1;
    }
    const scale = [1046.5, 1174.66, 1318.51, 1396.91, 1567.98, 1760.0, 1975.53];
    const f = scale[Math.abs(Math.round(Number(step) || 0)) % scale.length];
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    const t0 = now + 0.05;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t0);
    o.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.0008, t0);
    g2.gain.linearRampToValueAtTime(0.024, t0 + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.45);
    o.start(t0);
    o.stop(t0 + 0.47);
    this.ar15WebAudioNodes += 1;
  }

  // AR-15 点亮星座投影：一串向上的钢片琴琶音 + 一层柔柔的星光长音（variant 对应星座卡）
  playStarProject(variant = 0) {
    this.starProjectCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 587.33, 659.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.25, 1.5, 2, 2.5].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.09;
      o.type = idx % 2 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.7);
      o.start(t0);
      o.stop(t0 + 0.72);
      this.ar15WebAudioNodes += 1;
    });
    const pad = ctx.createOscillator();
    const pg = ctx.createGain();
    const tp = now + 0.3;
    pad.type = 'sine';
    pad.frequency.setValueAtTime(root * 0.5, tp);
    pad.connect(pg);
    pg.connect(ctx.destination);
    pg.gain.setValueAtTime(0.0008, tp);
    pg.gain.linearRampToValueAtTime(0.018, tp + 0.3);
    pg.gain.exponentialRampToValueAtTime(0.0008, tp + 1.4);
    pad.start(tp);
    pad.stop(tp + 1.45);
    this.ar15WebAudioNodes += 1;
  }

  // AR-15 好梦章：两声“叮——咚”的摇篮曲小钟（G5 → C5），轻轻落进梦里
  playStarDream() {
    this.starDreamCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [783.99, 523.25].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const bell = ctx.createOscillator();
      const bg = ctx.createGain();
      const g = ctx.createGain();
      const t0 = now + idx * 0.32;
      o.type = 'sine';
      bell.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      bell.frequency.setValueAtTime(f * 2.4, t0);
      bg.gain.setValueAtTime(0.1, t0);
      bg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      o.connect(g);
      bell.connect(bg);
      bg.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.032, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.95);
      o.start(t0);
      bell.start(t0);
      o.stop(t0 + 0.97);
      bell.stop(t0 + 0.97);
      this.ar15WebAudioNodes += 2;
    });
  }

  // AR-15 听雨白噪音：2 秒白噪声缓冲（与暖噪声分开，雨丝更“沙沙”）循环播放
  ensureRainNoiseBuffer(ctx) {
    if (this.rainNoiseBuffer || !ctx) return this.rainNoiseBuffer;
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.55 + white * 0.45;
      data[i] = last * 0.9;
    }
    this.rainNoiseBuffer = buffer;
    return buffer;
  }

  buildRainLoop() {
    if (this.muted || !this.rainActive || this.rainNodes) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const buffer = this.ensureRainNoiseBuffer(ctx);
    if (!buffer) return;
    const preset = RAIN_NOISE_PRESETS[this.rainWeatherId] || RAIN_NOISE_PRESETS.drizzle;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.loop = true;
    filter.type = preset.filter;
    filter.frequency.setValueAtTime(preset.freq, now);
    filter.Q.setValueAtTime(preset.q, now);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0008, now);
    gain.gain.linearRampToValueAtTime(preset.gain * this.rainVolume, now + 1.2);
    src.start(now);
    this.rainNodes = { src, filter, gain };
    this.rainLoopCount += 1;
    this.ar15WebAudioNodes += 1;
  }

  teardownRainLoop() {
    const nodes = this.rainNodes;
    this.rainNodes = null;
    if (!nodes || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setValueAtTime(Math.max(0.0008, nodes.gain.gain.value || 0.0008), now);
      nodes.gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.5);
      nodes.src.stop(now + 0.55);
    } catch (e) {}
  }

  // AR-15 开始听雨：weatherId 对应窗外天气（细雨 / 檐滴 / 阵雨 / 远雷 / 微风），volume 为音量倍率，chimeOn 决定风铃点缀
  startRainNoise(weatherId = 'drizzle', opts = {}) {
    this.stopRainNoise();
    this.rainWeatherId = RAIN_NOISE_PRESETS[weatherId] ? weatherId : 'drizzle';
    this.rainVolume = Math.max(0.2, Math.min(2, Number(opts.volume) || 1));
    this.rainChimeOn = opts.chimeOn !== false;
    this.rainActive = true;
    this.rainStep = 0;
    this.rainStartCount += 1;
    this.buildRainLoop();
    this.rainTimer = setInterval(() => this.rainTick(), 700);
    return this.getAr15AudioInfo();
  }

  // 听雨中换天气 / 音量 / 风铃：音量与滤波平滑过渡，天气变了就换一套白噪音
  setRainMix(opts = {}) {
    if (opts.volume !== undefined) this.rainVolume = Math.max(0.2, Math.min(2, Number(opts.volume) || 1));
    if (opts.chimeOn !== undefined) this.rainChimeOn = Boolean(opts.chimeOn);
    const nextWeather = opts.weatherId && RAIN_NOISE_PRESETS[opts.weatherId] ? opts.weatherId : this.rainWeatherId;
    const weatherChanged = nextWeather !== this.rainWeatherId;
    this.rainWeatherId = nextWeather;
    if (!this.rainActive) return this.getAr15AudioInfo();
    if (weatherChanged) {
      this.teardownRainLoop();
      this.buildRainLoop();
    } else if (this.rainNodes && this.ctx) {
      const preset = RAIN_NOISE_PRESETS[this.rainWeatherId] || RAIN_NOISE_PRESETS.drizzle;
      const now = this.ctx.currentTime;
      try {
        this.rainNodes.gain.gain.cancelScheduledValues(now);
        this.rainNodes.gain.gain.setValueAtTime(Math.max(0.0008, this.rainNodes.gain.gain.value || 0.0008), now);
        this.rainNodes.gain.gain.linearRampToValueAtTime(preset.gain * this.rainVolume, now + 0.4);
      } catch (e) {}
    }
    return this.getAr15AudioInfo();
  }

  stopRainNoise() {
    if (this.rainTimer) {
      clearInterval(this.rainTimer);
      this.rainTimer = null;
    }
    const wasActive = this.rainActive;
    this.rainActive = false;
    this.teardownRainLoop();
    if (wasActive) this.rainStopCount += 1;
    return this.getAr15AudioInfo();
  }

  // 白噪音节拍：按天气预设的步长点缀檐滴 / 风铃 / 远雷（确定性步长，不用随机数）
  rainTick() {
    if (!this.rainActive || (typeof document !== 'undefined' && document.hidden)) return;
    this.rainStep += 1;
    this.rainTickCount += 1;
    const preset = RAIN_NOISE_PRESETS[this.rainWeatherId] || RAIN_NOISE_PRESETS.drizzle;
    if (preset.dripEvery && this.rainStep % preset.dripEvery === 0) this.playRainDrip(this.rainStep);
    const chimeEvery = preset.chimeEvery || 6;
    if (this.rainChimeOn && this.rainStep % chimeEvery === 0) this.playRainChime(this.rainStep);
    if (preset.rumbleEvery && this.rainStep % preset.rumbleEvery === 0) this.playRainRumble();
  }

  // 檐下一滴雨：正弦快速下滑的“嗒”（音量跟着白噪音音量走）
  playRainDrip(idx = 0) {
    this.rainDripCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const f = [987.77, 880.0, 1174.66, 783.99, 1046.5][Math.abs(Math.round(Number(idx) || 0)) % 5];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.5, now);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, now + 0.06);
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.022 * this.rainVolume, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0006, now + 0.16);
    o.start(now);
    o.stop(now + 0.18);
    this.ar15WebAudioNodes += 1;
  }

  // 窗边雨滴风铃：玻璃风铃三个泛音叮——（variant 让每一下音高略有不同）
  playRainChime(variant = 0) {
    this.rainChimeCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [1567.98, 1760.0, 1318.51, 2093.0];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    const vol = this.rainActive ? Math.max(0.6, this.rainVolume) : 1;
    [1, 2.76, 5.4].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.004;
      o.type = 'sine';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime((idx === 0 ? 0.024 : 0.008) * vol, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + (idx === 0 ? 1.1 : 0.5));
      o.start(t0);
      o.stop(t0 + 1.12);
      this.ar15WebAudioNodes += 1;
    });
  }

  // 很远很远的闷雷：低通暖噪声慢慢鼓起又散去（音量压得很低，不吓人）
  playRainRumble() {
    this.rainRumbleCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (!buffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buffer;
    src.loop = true;
    lp.type = 'lowpass';
    lp.Q.setValueAtTime(0.7, now);
    lp.frequency.setValueAtTime(140, now);
    lp.frequency.linearRampToValueAtTime(220, now + 0.6);
    src.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0008, now);
    g.gain.linearRampToValueAtTime(0.05 * this.rainVolume, now + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0008, now + 1.8);
    src.start(now);
    src.stop(now + 1.85);
    this.ar15WebAudioNodes += 1;
  }

  getAr15AudioInfo() {
    return {
      starDialCount: this.starDialCount,
      starProjectCount: this.starProjectCount,
      starDreamCount: this.starDreamCount,
      rainActive: Boolean(this.rainActive),
      rainLoopLive: Boolean(this.rainNodes),
      rainWeatherId: this.rainWeatherId,
      rainVolume: this.rainVolume,
      rainChimeOn: Boolean(this.rainChimeOn),
      rainStartCount: this.rainStartCount,
      rainStopCount: this.rainStopCount,
      rainLoopCount: this.rainLoopCount,
      rainTickCount: this.rainTickCount,
      rainDripCount: this.rainDripCount,
      rainChimeCount: this.rainChimeCount,
      rainRumbleCount: this.rainRumbleCount,
      ar15WebAudioNodes: this.ar15WebAudioNodes
    };
  }

  // AR-16 绣一针：针穿过绷布“噗”的一下（窄带暖噪声）+ 一声小小的拨弦（step 越大音越高，你一针她一针）
  playEmbroideryStitch(step = 0) {
    this.embroideryStitchCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(2.4, now);
      bp.frequency.setValueAtTime(1800, now);
      bp.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.026, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.1);
      src.start(now);
      src.stop(now + 0.12);
      this.ar16WebAudioNodes += 1;
    }
    const scale = [659.25, 739.99, 783.99, 880.0, 987.77, 1046.5, 1174.66, 1318.51];
    const f = scale[Math.abs(Math.round(Number(step) || 0)) % scale.length];
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    const t0 = now + 0.06;
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t0);
    o.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.0008, t0);
    g2.gain.linearRampToValueAtTime(0.022, t0 + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.32);
    o.start(t0);
    o.stop(t0 + 0.34);
    this.ar16WebAudioNodes += 1;
  }

  // AR-16 收针挂墙：木绷架“咔”一声轻响 + 一串温柔的三音小琶音（variant 对应绣样）
  playEmbroideryHang(variant = 0) {
    this.embroideryHangCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const knock = ctx.createOscillator();
    const kg = ctx.createGain();
    knock.type = 'sine';
    knock.frequency.setValueAtTime(320, now);
    knock.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    knock.connect(kg);
    kg.connect(ctx.destination);
    kg.gain.setValueAtTime(0.0008, now);
    kg.gain.linearRampToValueAtTime(0.04, now + 0.004);
    kg.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);
    knock.start(now);
    knock.stop(now + 0.1);
    this.ar16WebAudioNodes += 1;
    const roots = [523.25, 587.33, 659.25, 698.46, 783.99, 587.33, 659.25, 523.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [1, 1.25, 1.5].forEach((r, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.08 + idx * 0.11;
      o.type = idx === 1 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(root * r, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.028, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.6);
      o.start(t0);
      o.stop(t0 + 0.62);
      this.ar16WebAudioNodes += 1;
    });
  }

  // AR-16 小暖炉：炉火“噼啪”几声细碎的轻响（高通暖噪声短促爆点）+ 一层很轻的暖风低吟（level 越旺噼啪越多）
  playHearthCrackle(level = 1) {
    this.hearthCrackleCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (!buffer) return;
    const now = ctx.currentTime;
    const lvl = Math.max(1, Math.min(3, Math.round(Number(level) || 1)));
    // 噼啪声用白噪声缓冲（更脆），暖风低吟仍用暖噪声
    const crackBuf = this.ensureRainNoiseBuffer(ctx) || buffer;
    for (let i = 0; i < lvl + 1; i++) {
      const src = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const t0 = now + i * 0.09 + (this.hearthCrackleCount % 3) * 0.013;
      src.buffer = crackBuf;
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1200 + i * 380, t0);
      src.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.05);
      src.start(t0, (i * 0.17) % 1);
      src.stop(t0 + 0.06);
      this.ar16WebAudioNodes += 1;
    }
    const hum = ctx.createBufferSource();
    const lp = ctx.createBiquadFilter();
    const hg = ctx.createGain();
    hum.buffer = buffer;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(240, now);
    hum.connect(lp);
    lp.connect(hg);
    hg.connect(ctx.destination);
    hg.gain.setValueAtTime(0.0008, now);
    hg.gain.linearRampToValueAtTime(0.018 * lvl, now + 0.2);
    hg.gain.exponentialRampToValueAtTime(0.0008, now + 0.9);
    hum.start(now);
    hum.stop(now + 0.95);
    this.ar16WebAudioNodes += 1;
  }

  // AR-16 一起生个小火：火柴“嚓”一下（带通暖噪声上滑）后接两声暖暖的低音
  playHearthKindle() {
    this.hearthKindleCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(1.2, now);
      bp.frequency.setValueAtTime(900, now);
      bp.frequency.exponentialRampToValueAtTime(3200, now + 0.16);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.04, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);
      src.start(now);
      src.stop(now + 0.24);
      this.ar16WebAudioNodes += 1;
    }
    [196.0, 261.63].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + 0.2 + idx * 0.16;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.7);
      o.start(t0);
      o.stop(t0 + 0.72);
      this.ar16WebAudioNodes += 1;
    });
  }

  // AR-16 翻面：小平底锅上“滋——”的一下（高通暖噪声淡出）+ 一声软软的松饼落锅“噗”（step 让每一下略有不同）
  playSnackFlip(step = 0) {
    this.snackFlipCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const buffer = this.ensureRainNoiseBuffer(ctx) || this.ensureWarmNoiseBuffer(ctx);
    if (buffer) {
      const src = ctx.createBufferSource();
      const hp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      src.buffer = buffer;
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2600, now);
      src.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, now);
      g.gain.linearRampToValueAtTime(0.02, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);
      src.start(now);
      src.stop(now + 0.44);
      this.ar16WebAudioNodes += 1;
    }
    const o = ctx.createOscillator();
    const g2 = ctx.createGain();
    const t0 = now + 0.12;
    const f = [220.0, 246.94, 261.63, 293.66, 329.63][Math.abs(Math.round(Number(step) || 0)) % 5];
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.6, t0);
    o.frequency.exponentialRampToValueAtTime(f, t0 + 0.08);
    o.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(0.0008, t0);
    g2.gain.linearRampToValueAtTime(0.034, t0 + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.18);
    o.start(t0);
    o.stop(t0 + 0.2);
    this.ar16WebAudioNodes += 1;
  }

  // AR-16 分着吃：两声“叮咚”的小餐铃 + 一声柔柔的长音（variant 对应松饼口味）
  playSnackShare(variant = 0) {
    this.snackShareCount += 1;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const roots = [783.99, 880.0, 698.46, 659.25];
    const root = roots[Math.abs(Math.round(Number(variant) || 0)) % roots.length];
    [root, root * 0.75].forEach((f, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t0 = now + idx * 0.18;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0008, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.7);
      o.start(t0);
      o.stop(t0 + 0.72);
      this.ar16WebAudioNodes += 1;
    });
    const pad = ctx.createOscillator();
    const pg = ctx.createGain();
    const tp = now + 0.3;
    pad.type = 'triangle';
    pad.frequency.setValueAtTime(root * 0.5, tp);
    pad.connect(pg);
    pg.connect(ctx.destination);
    pg.gain.setValueAtTime(0.0008, tp);
    pg.gain.linearRampToValueAtTime(0.014, tp + 0.2);
    pg.gain.exponentialRampToValueAtTime(0.0008, tp + 1.1);
    pad.start(tp);
    pad.stop(tp + 1.15);
    this.ar16WebAudioNodes += 1;
  }

  getAr16AudioInfo() {
    return {
      embroideryStitchCount: this.embroideryStitchCount,
      embroideryHangCount: this.embroideryHangCount,
      hearthCrackleCount: this.hearthCrackleCount,
      hearthKindleCount: this.hearthKindleCount,
      snackFlipCount: this.snackFlipCount,
      snackShareCount: this.snackShareCount,
      ar16WebAudioNodes: this.ar16WebAudioNodes
    };
  }

  getAr11AudioInfo() {
    return {
      bentoPlaceCount: this.bentoPlaceCount,
      bentoLidChimeCount: this.bentoLidChimeCount,
      bentoRescueChimeCount: this.bentoRescueChimeCount,
      puzzleSnapCount: this.puzzleSnapCount,
      puzzleCompleteChimeCount: this.puzzleCompleteChimeCount,
      ar11WebAudioNodes: this.ar11WebAudioNodes
    };
  }

  getAr10AudioInfo() {
    return {
      brushStrokeCount: this.brushStrokeCount,
      paintFinishChimeCount: this.paintFinishChimeCount,
      letterOpenCount: this.letterOpenCount,
      letterSentChimeCount: this.letterSentChimeCount,
      ar10WebAudioNodes: this.ar10WebAudioNodes
    };
  }

  getAr9AudioInfo() {
    return {
      pagePressCount: this.pagePressCount,
      stargazeNoteCount: this.stargazeNoteCount,
      stargazeChimeCount: this.stargazeChimeCount,
      stargazeWebAudioNodes: this.stargazeWebAudioNodes
    };
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
