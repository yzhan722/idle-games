import type { EnhancedContentPack } from "./types";

const FAST_ACTIONS = new Set([
  "act_chop_wood_t1",
  "act_craft_lumber_t1",
  "act_craft_weapon_wooden_sword",
  "act_craft_wood_chest",
]);

export function isE2eFast() {
  return process.env.E2E_FAST === "1";
}

export function applyE2eFastContent(pack: EnhancedContentPack) {
  if (!isE2eFast()) return pack;
  for (const action of pack.actions as Array<{ id: string; duration: number }>) {
    if (FAST_ACTIONS.has(action.id)) action.duration = 400;
  }
  return pack;
}

export function e2eFastCombatInterval(ms: number) {
  if (!isE2eFast()) return ms;
  return Math.max(80, Math.floor(ms * 0.12));
}

export function e2eFastHeavyChopCdMs() {
  return isE2eFast() ? 400 : 8000;
}
