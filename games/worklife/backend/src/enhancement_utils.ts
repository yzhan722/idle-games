import type { EnhancedContentPack } from "./types";

type ItemLike = { id?: string; name?: string; type?: string };

export function itemMatchesEnhancementRule(item: ItemLike, ruleItemType: string): boolean {
  const id = (item.id || "").toLowerCase();
  const name = item.name || "";
  const type = item.type || "";

  switch (ruleItemType) {
    case "all_wooden_equipment":
      return (
        name.includes("木") ||
        id.includes("wood") ||
        id.includes("bow") ||
        id.includes("logging")
      );
    case "all_metal_equipment":
      return (
        name.includes("金属") ||
        name.includes("铁") ||
        name.includes("钢") ||
        id.includes("metal") ||
        id.includes("ingot") ||
        id.includes("axe") ||
        id.includes("hammer") ||
        (type === "weapon" && !id.includes("wood"))
      );
    case "cloth_and_leather_equipment":
      return (
        name.includes("布") ||
        name.includes("皮") ||
        id.includes("cloth") ||
        id.includes("leather") ||
        (type === "armor" &&
          !itemMatchesEnhancementRule(item, "all_wooden_equipment") &&
          !itemMatchesEnhancementRule(item, "all_metal_equipment"))
      );
    default:
      return false;
  }
}

export function findEnhancementRuleForItem(
  item: ItemLike,
  contentPack: EnhancedContentPack
): { rule: (typeof contentPack.enhancementRules)[number]; requiredProfession: string } | null {
  for (const rule of contentPack.enhancementRules || []) {
    if (itemMatchesEnhancementRule(item, rule.itemType)) {
      return { rule, requiredProfession: rule.requiredProfession };
    }
  }
  return null;
}

export function hasEnhancementSkill(
  unlockedRecipes: string[],
  professionId: string,
  ruleItemType?: string
): boolean {
  if (unlockedRecipes.includes(`${professionId}_enhancement`)) return true;
  if (ruleItemType && unlockedRecipes.includes(ruleItemType)) return true;
  return false;
}

export function enhancementUnlockIds(
  professionId: string,
  nodeId: string,
  enhancements?: string[]
): string[] {
  const ids = new Set<string>([nodeId, ...(enhancements || [])]);
  if (enhancements?.length) {
    ids.add(`${professionId}_enhancement`);
  }
  return [...ids];
}
