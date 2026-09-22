import { playGameSound } from "../gameplay/sound";

export function playCombatHit(isCrit: boolean) {
  playGameSound(isCrit ? "combat-crit" : "combat-hit");
}

export function playCombatWin() {
  playGameSound("victory");
}
