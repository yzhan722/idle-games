export const GAME_SOUNDS = [
  "gather-complete",
  "craft-complete",
  "equip",
  "level-up",
  "unlock",
  "combat-hit",
  "combat-crit",
  "skill",
  "skill-ready",
  "boss-phase",
  "victory",
  "boss-win",
  "rare-drop",
] as const;

export type GameSound = (typeof GAME_SOUNDS)[number];

let soundEnabled = true;
let ctx: AudioContext | null = null;

export function setGameSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isGameSoundEnabled() {
  return soundEnabled;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

function beep(freq: number, duration: number, type: OscillatorType, gainValue: number, delay = 0) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

const CUES: Record<GameSound, () => void> = {
  "gather-complete": () => beep(180, 0.08, "square", 0.03),
  "craft-complete": () => {
    beep(330, 0.07, "triangle", 0.03);
    beep(440, 0.08, "triangle", 0.03, 0.07);
  },
  equip: () => beep(520, 0.09, "sawtooth", 0.025),
  "level-up": () => {
    beep(392, 0.08, "triangle", 0.035);
    beep(523, 0.08, "triangle", 0.035, 0.08);
    beep(659, 0.12, "triangle", 0.04, 0.16);
  },
  unlock: () => {
    beep(523, 0.1, "sine", 0.035);
    beep(784, 0.14, "sine", 0.04, 0.1);
  },
  "combat-hit": () => beep(196, 0.08, "square", 0.03),
  "combat-crit": () => beep(740, 0.09, "square", 0.05),
  skill: () => {
    beep(220, 0.06, "sawtooth", 0.04);
    beep(110, 0.1, "sawtooth", 0.035, 0.05);
  },
  "skill-ready": () => {
    beep(587, 0.06, "triangle", 0.03);
    beep(880, 0.09, "triangle", 0.035, 0.06);
  },
  "boss-phase": () => {
    beep(98, 0.16, "square", 0.045);
    beep(82, 0.18, "square", 0.04, 0.12);
  },
  "rare-drop": () => {
    beep(659, 0.08, "sine", 0.04);
    beep(988, 0.1, "sine", 0.04, 0.08);
    beep(1319, 0.16, "sine", 0.045, 0.16);
  },
  victory: () => {
    beep(392, 0.1, "triangle", 0.04);
    beep(784, 0.16, "triangle", 0.04, 0.12);
  },
  "boss-win": () => {
    beep(330, 0.1, "triangle", 0.04);
    beep(392, 0.1, "triangle", 0.04, 0.1);
    beep(523, 0.1, "triangle", 0.04, 0.2);
    beep(784, 0.22, "triangle", 0.045, 0.32);
  },
};

export function playGameSound(name: GameSound) {
  if (!soundEnabled) return;
  CUES[name]?.();
}
