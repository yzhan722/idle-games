/** 摘下腰包、布袋后多出来的格子不再提交，否则服务端会整份拒绝（战斗配置面板与药剂栏都走这里）。 */
export function trimLoadout<F, D, L extends { food?: F[]; drink?: D[] }>(loadout: L, counts: { food: number; drink: number }): L & { food: F[]; drink: D[] } {
  return { ...loadout, food: (loadout.food ?? []).slice(0, counts.food), drink: (loadout.drink ?? []).slice(0, counts.drink) };
}
