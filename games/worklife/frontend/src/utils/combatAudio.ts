/** Tiny Web Audio hits for combat — no asset files required. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

export function playCombatHit(isCrit: boolean) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.value = isCrit ? 740 : 196;
  gain.gain.value = isCrit ? 0.05 : 0.03;
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.1);
}

export function playCombatWin() {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(392, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(784, ac.currentTime + 0.18);
  gain.gain.value = 0.04;
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.24);
}
