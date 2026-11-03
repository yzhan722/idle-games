export { T1_ASSET_KEYS, type T1AssetKey } from "./contract";

const CRAFT_OUTPUT: Record<string, string> = {
  act_craft_lumber_t1: "materials/lumber_1",
  act_craft_weapon_wooden_sword: "equipment/weapon_wooden_sword",
  act_craft_wood_chest: "equipment/armor_wood_chest",
};

/** Folder for an item id: gear → equipment, edibles → consumables, everything else → materials. */
export function itemFolderFor(itemId: string): "equipment" | "consumables" | "materials" {
  if (
    /^(weapon|armor|tool|shield|offhand|accessory|ring|amulet|pendant|crown|charm)_/.test(itemId) ||
    /_(ring|amulet|pendant)$/.test(itemId) ||
    /^(sovereign|omega)_crown$/.test(itemId)
  ) {
    return "equipment";
  }
  if (/^(food|potion|drink|elixir|dish)_/.test(itemId)) return "consumables";
  return "materials";
}

export function t1KeyFor(kind: string, id: string): string | undefined {
  if (kind === "ui") return `ui/${id}`;
  if (kind === "tree") return `trees/${id}`;
  if (kind === "monster") return `monsters/${id}`;
  if (kind === "character") return `character/${id}`;
  if (kind === "skills") return `skills/${id}`;
  if (kind === "craft") return CRAFT_OUTPUT[id] || `${itemFolderFor(id)}/${id}`;
  if (kind === "equipment") return `equipment/${id}`;
  if (kind === "materials") return `materials/${id}`;
  if (kind === "item") return id === "gold" ? "ui/gold" : `${itemFolderFor(id)}/${id}`;
  return `${kind}/${id}`;
}
