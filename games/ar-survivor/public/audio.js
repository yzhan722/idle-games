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
      if (this.muted || !this.bgmEnabled || document.hidden) return;
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
          .replace(/[>\/<^=w_~♪✨🐾🍚🍵🍤🍰🌊🏄‍♀️🤲💗💢🐟⭐⚔️🎯🪙🎉🔥☀️👀📚☕🚀✌️✊🖐️📸]/g, '')
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
}

export const petAudio = new PetAudioAndHaptics();
