import type { CombatSheet } from "./combatSheet";

export type PackItem = {
  id: string;
  name?: string;
  atk?: number;
  def?: number;
  hp?: number;
  type?: string;
};

export function craftWhy(
  item: PackItem | undefined,
  sheet: CombatSheet,
  opts: { equippedMainAtk: number; outputEquipped?: boolean }
): string {
  if (!item) return "做成之后会进背包。";
  if (item.id === "lumber_1") return "用于木头短剑。两根原木换一块。";
  if (item.atk) {
    const without = opts.outputEquipped ? sheet.atk - Number(item.atk) : sheet.atk - opts.equippedMainAtk;
    const next = without + Number(item.atk);
    return `ATK ${without} → ${next} (+${item.atk})`;
  }
  if (item.def) {
    const without = opts.outputEquipped ? sheet.def - Number(item.def) : sheet.def;
    return `DEF ${without} → ${without + Number(item.def)} (+${item.def})`;
  }
  if (item.hp) {
    const without = opts.outputEquipped ? sheet.hp - Number(item.hp) : sheet.hp;
    return `HP ${without} → ${without + Number(item.hp)} (+${item.hp})`;
  }
  return "做成之后会进背包。";
}

export function missingMaterials(
  requires: Array<{ item: string; count: number }>,
  inventory: Record<string, number> | undefined,
  nameOf: (id: string) => string
): string {
  const missing = requires
    .map((req) => {
      const have = inventory?.[req.item] || 0;
      if (have >= req.count) return null;
      return `${nameOf(req.item)} ${have}/${req.count}`;
    })
    .filter(Boolean);
  if (missing.length === 0) return "材料齐了，可以做。";
  return `还缺 ${missing.join("、")}`;
}
