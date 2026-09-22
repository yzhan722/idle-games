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
  if (item.type === "offhand") return slot === "off_hand";
  return false;
}

export function canEquipItem(
  inventory: Record<string, number>,
  slot: EquipSlot,
  itemId: string,
  items: EquipItemDef[]
): EquipResult {
  const qty = Number(inventory[itemId] || 0);
  if (qty <= 0) {
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
