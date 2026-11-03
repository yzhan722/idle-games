export const EQUIP_SLOT_KEYS = [
  "main_hand",
  "off_hand",
  "head",
  "chest",
  "legs",
  "feet",
  /** Gloves: the pack ships 14 `slot: "hands"` pieces (MWI has a hands slot too). */
  "hands",
  "accessory1",
  "accessory2",
  /** MWI-style tool slot: speeds up one profession's actions, never counts in combat. */
  "tool",
] as const;

export type EquipSlot = (typeof EQUIP_SLOT_KEYS)[number];

export type EquipItemDef = {
  id: string;
  type?: string;
  slot?: string;
  toolFor?: string;
  toolSpeed?: number;
};

export type EquipResult =
  | { ok: true }
  | { ok: false; error: string; message: string };

function slotMatchesItem(slot: EquipSlot, item: EquipItemDef): boolean {
  // Tools can go in the tool slot; a tool that is also a weapon may still be wielded normally.
  if (slot === "tool") return typeof item.toolFor === "string" && item.toolFor.length > 0;
  // Pack accessories say slot: "accessory"; either accessory slot takes them.
  if (item.slot === "accessory" || item.type === "accessory") return slot === "accessory1" || slot === "accessory2";
  if (typeof item.slot === "string" && item.slot.length > 0) {
    return item.slot === slot;
  }
  if (item.type === "weapon") return slot === "main_hand";
  if (item.type === "offhand" || item.type === "shield") return slot === "off_hand";
  return false;
}

export function canEquipItem(
  inventory: Record<string, number>,
  slot: EquipSlot,
  itemId: string,
  items: EquipItemDef[],
  equipment?: Record<string, unknown>
): EquipResult {
  const qty = Number(inventory[itemId] || 0);
  // 装备槽存的是物品 id 引用：同一件物品（数量 1）不能同时占多个槽位，
  // 否则 equippedStatSum 会把同一件装备的属性按槽位数重复计算。
  const alreadyEquipped = equipment
    ? EQUIP_SLOT_KEYS.filter((s) => s !== slot && equipment[s] === itemId).length
    : 0;
  if (qty <= alreadyEquipped) {
    return { ok: false, error: "item_not_owned", message: "背包中没有这件物品" };
  }
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    return { ok: false, error: "unknown_item", message: "未知物品" };
  }
  if (!slotMatchesItem(slot, item)) {
    return { ok: false, error: "slot_mismatch", message: "物品不能装到这个部位" };
  }
  return { ok: true };
}
