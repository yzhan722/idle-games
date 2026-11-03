import type { EnhancedContentPack } from "./types";

type ItemLike = { id?: string; name?: string; type?: string; slot?: string; toolFor?: string };

const ENHANCEABLE_TYPES = new Set(["weapon", "armor", "offhand", "shield", "accessory", "tool"]);

export function itemMatchesEnhancementRule(item: ItemLike, ruleItemType: string): boolean {
  const id = (item.id || "").toLowerCase();
  const name = item.name || "";
  const type = item.type || "";
  const isGear = ENHANCEABLE_TYPES.has(type) || Boolean(item.slot) || Boolean(item.toolFor);

  const isWooden =
    name.includes("木") ||
    name.includes("藤") ||
    name.includes("弓") ||
    name.includes("法杖") ||
    name.includes("魔杖") ||
    id.includes("wood") ||
    id.includes("bow") ||
    id.includes("staff") ||
    id.includes("wand") ||
    id.includes("logging") ||
    item.toolFor === "skill_woodcutter" ||
    item.toolFor === "skill_woodworking";

  const isClothOrLeather =
    name.includes("布") ||
    name.includes("皮") ||
    name.includes("丝") ||
    name.includes("袍") ||
    name.includes("服") ||
    id.includes("cloth") ||
    id.includes("leather") ||
    id.includes("silk") ||
    id.includes("robe") ||
    item.toolFor === "skill_tailor" ||
    item.toolFor === "skill_tailoring" ||
    item.toolFor === "skill_farmer" ||
    item.toolFor === "skill_husbandry" ||
    item.toolFor === "skill_chef" ||
    item.toolFor === "skill_cooking" ||
    item.toolFor === "skill_alchemist" ||
    item.toolFor === "skill_alchemy";

  switch (ruleItemType) {
    case "all_wooden_equipment":
      return isGear && isWooden;
    case "all_metal_equipment":
      return (
        isGear &&
        !isWooden &&
        !isClothOrLeather &&
        (name.includes("金属") ||
          name.includes("铁") ||
          name.includes("钢") ||
          name.includes("铜") ||
          name.includes("银") ||
          name.includes("金") ||
          name.includes("重") ||
          name.includes("盾") ||
          name.includes("剑") ||
          name.includes("刀") ||
          name.includes("枪") ||
          name.includes("锤") ||
          name.includes("戒") ||
          name.includes("链") ||
          name.includes("符") ||
          id.includes("metal") ||
          id.includes("ingot") ||
          id.includes("iron") ||
          id.includes("steel") ||
          id.includes("mithril") ||
          id.includes("adamant") ||
          id.includes("axe") ||
          id.includes("hammer") ||
          id.includes("pickaxe") ||
          type === "weapon" ||
          type === "shield" ||
          type === "offhand" ||
          type === "accessory" ||
          item.toolFor === "skill_blacksmith" ||
          item.toolFor === "skill_smithing" ||
          item.toolFor === "skill_enhancing")
      );
    case "cloth_and_leather_equipment":
      return (
        isGear &&
        (isClothOrLeather ||
          (!itemMatchesEnhancementRule(item, "all_wooden_equipment") &&
            !itemMatchesEnhancementRule(item, "all_metal_equipment")))
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
