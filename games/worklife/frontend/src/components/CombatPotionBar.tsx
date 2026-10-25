import { useEffect, useRef, useState } from "react";
import { T1ItemIcon } from "./T1Art";
import type { CombatLoadout } from "./CombatLoadoutPanel";
import { slotCounts } from "./CombatLoadoutPanel";

type PackItem = {
  id: string;
  name: string;
  type?: string;
  value?: number;
  foodSlots?: number;
  drinkSlots?: number;
  effect?: {
    hp?: number;
    mp?: number;
    buff?: {
      id: string;
      name: string;
      durationSec?: number;
      multipliers?: Record<string, number>;
      stats?: Record<string, number>;
    };
  };
};

type ActiveBuffItem = {
  id: string;
  name: string;
  sourceItemId: string;
  expiresAt: string;
  multipliers?: Record<string, number>;
  stats?: Record<string, number>;
};

type Props = {
  loadout: CombatLoadout | undefined;
  items: PackItem[] | undefined;
  inventory: Record<string, number>;
  equipment: Record<string, unknown> | undefined;
  activeBuffs: ActiveBuffItem[] | undefined;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  foodReadyAt?: number[];
  mpReadyAt?: number[];
  now: number;
  inCombat?: boolean;
  iconOf: (itemId: string) => string;
  onChangeLoadout: (next: CombatLoadout) => Promise<void> | void;
  onManualConsume: (itemId: string) => Promise<void> | void;
  onQuickBuyPotion?: (itemId: string, qty: number) => Promise<boolean | void> | boolean | void;
};

const HP_POTION_TIER_IDS = ["potion_hp_t1", "potion_hp_t2", "potion_hp_t3", "potion_hp_t4"];
const MP_POTION_TIER_IDS = ["potion_mp_t1", "potion_mp_t2", "potion_mp_t3", "potion_mp_t4"];
const STATUS_POTION_IDS = [
  "potion_battle_fury",
  "potion_iron_skin",
  "potion_arcane_surge",
  "potion_guardian_elixir",
];

export function describePotionEffect(d?: PackItem): string {
  if (!d?.effect) return "";
  const parts: string[] = [];
  if (Number(d.effect.hp) > 0) parts.push(`+${d.effect.hp} 生命`);
  if (Number(d.effect.mp) > 0) parts.push(`+${d.effect.mp} 魔力`);
  const b = d.effect.buff;
  if (b) {
    for (const [k, v] of Object.entries(b.stats || {})) {
      parts.push(`${k === "atk" ? "攻击" : k === "def" ? "防御" : k} +${v}`);
    }
    for (const [k, v] of Object.entries(b.multipliers || {})) {
      const label =
        k === "combatSpeed"
          ? "攻速"
          : k === "xpGain"
          ? "经验"
          : k === "goldGain"
          ? "金币"
          : k === "gatherSpeed"
          ? "采集"
          : k === "craftSpeed"
          ? "制作"
          : k;
      parts.push(`${label} +${Math.round((Number(v) - 1) * 100)}%`);
    }
  }
  return parts.join(" · ");
}

type ActiveSlotKey =
  | { kind: "hp"; index: number }
  | { kind: "mp"; index: 0 }
  | { kind: "status"; index: number };

/**
 * 纯图标战斗药剂栏（无任何文字）：
 * - 顶部一排紧凑图标槽：[❤️ HP槽] [💧 MP槽] [⚡ 状态1] [⚡ 状态2] [⚡ 状态3]（及腰包额外食物槽）
 * - 槽位仅显示物品图标、右上角库存/生效状态圆点、底部冷却/持续时间进度条
 * - 点击任意图标槽弹出纯图标浮层：可一键饮用(🧪)、快捷补货(🛒)、清空槽位(🚫)或点选切换药剂图标
 */
export function CombatPotionBar(props: Props) {
  const [lo, setLo] = useState<CombatLoadout>(
    props.loadout || { food: [], drink: [], mp: [], autoRepeat: false }
  );
  const [openSlot, setOpenSlot] = useState<ActiveSlotKey | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const serverKey = JSON.stringify(props.loadout || null);
  useEffect(() => {
    setLo(props.loadout || { food: [], drink: [], mp: [], autoRepeat: false });
  }, [serverKey]);

  useEffect(() => {
    if (!openSlot) return;
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenSlot(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openSlot]);

  const counts = slotCounts(props.equipment, props.items);
  const allItems = props.items || [];
  const itemById = (id: string) => allItems.find((x) => x.id === id);

  // Candidate items for each slot type (owned items first, plus shop tier potions)
  const hpCandidates = allItems.filter(
    (i) =>
      ((i.type === "consumable" || i.type === "food") &&
        Number(i.effect?.hp) > 0 &&
        (props.inventory[i.id] || 0) > 0) ||
      HP_POTION_TIER_IDS.includes(i.id)
  );
  hpCandidates.sort((a, b) => {
    const aOwn = (props.inventory[a.id] || 0) > 0 ? 1 : 0;
    const bOwn = (props.inventory[b.id] || 0) > 0 ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    const aIsPot = a.id.startsWith("potion_hp") ? 1 : 0;
    const bIsPot = b.id.startsWith("potion_hp") ? 1 : 0;
    if (aIsPot !== bIsPot) return bIsPot - aIsPot;
    return Number(a.effect?.hp || 0) - Number(b.effect?.hp || 0);
  });

  const mpCandidates = allItems.filter(
    (i) =>
      ((i.type === "consumable" || i.type === "food") &&
        Number(i.effect?.mp) > 0 &&
        (props.inventory[i.id] || 0) > 0) ||
      MP_POTION_TIER_IDS.includes(i.id)
  );
  mpCandidates.sort((a, b) => {
    const aOwn = (props.inventory[a.id] || 0) > 0 ? 1 : 0;
    const bOwn = (props.inventory[b.id] || 0) > 0 ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    const aIsPot = a.id.startsWith("potion_mp") ? 1 : 0;
    const bIsPot = b.id.startsWith("potion_mp") ? 1 : 0;
    if (aIsPot !== bIsPot) return bIsPot - aIsPot;
    return Number(a.effect?.mp || 0) - Number(b.effect?.mp || 0);
  });

  const statusCandidates = allItems.filter(
    (i) =>
      (((i.type === "consumable" || i.type === "food") &&
        !!i.effect?.buff &&
        !i.id.startsWith("potion_hp_") &&
        !i.id.startsWith("potion_mp_") &&
        (props.inventory[i.id] || 0) > 0) ||
        STATUS_POTION_IDS.includes(i.id))
  );
  statusCandidates.sort((a, b) => {
    const aOwn = (props.inventory[a.id] || 0) > 0 ? 1 : 0;
    const bOwn = (props.inventory[b.id] || 0) > 0 ? 1 : 0;
    if (aOwn !== bOwn) return bOwn - aOwn;
    const aIdx = STATUS_POTION_IDS.indexOf(a.id);
    const bIdx = STATUS_POTION_IDS.indexOf(b.id);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  const defaultHpTrigger = Math.max(1, Math.round(props.playerMaxHp * 0.5));
  const defaultMpTrigger = Math.max(1, Math.round(Math.max(20, props.playerMaxMp) * 0.4));

  const commitLoadout = (next: CombatLoadout) => {
    setLo(next);
    props.onChangeLoadout(next);
  };

  const setHpSlot = (slotIdx: number, itemId: string) => {
    const nextFood = [...(lo.food || [])];
    if (!itemId) {
      nextFood.splice(slotIdx, 1);
    } else {
      const dup = nextFood.findIndex((f, i) => i !== slotIdx && f?.itemId === itemId);
      nextFood[slotIdx] = {
        itemId,
        triggerMissingHp: nextFood[slotIdx]?.triggerMissingHp ?? defaultHpTrigger,
      };
      if (dup >= 0) nextFood.splice(dup, 1);
    }
    commitLoadout({ ...lo, food: nextFood.filter(Boolean) });
  };

  const setMpSlot = (itemId: string) => {
    if (!itemId) {
      commitLoadout({ ...lo, mp: [] });
    } else {
      const prevTrigger = lo.mp?.[0]?.triggerMissingMp ?? defaultMpTrigger;
      commitLoadout({
        ...lo,
        mp: [{ itemId, triggerMissingMp: prevTrigger }],
      });
    }
  };

  const setStatusSlot = (slotIdx: number, itemId: string) => {
    const nextDrink = [...(lo.drink || [])];
    if (!itemId) {
      nextDrink.splice(slotIdx, 1);
    } else {
      const dup = nextDrink.findIndex((d, i) => i !== slotIdx && d?.itemId === itemId);
      nextDrink[slotIdx] = { itemId };
      if (dup >= 0) nextDrink.splice(dup, 1);
    }
    commitLoadout({ ...lo, drink: nextDrink.filter(Boolean) });
  };

  const handleDrinkNow = async (itemId: string) => {
    if (!itemId || busyItem) return;
    setBusyItem(itemId);
    try {
      await props.onManualConsume(itemId);
    } finally {
      setBusyItem(null);
    }
  };

  const handleSelectCandidate = async (slot: ActiveSlotKey, itemId: string) => {
    const owned = props.inventory[itemId] || 0;
    if (owned < 1 && props.onQuickBuyPotion) {
      setBusyItem(itemId);
      try {
        const bought = await props.onQuickBuyPotion(itemId, 1);
        if (bought === false) {
          return;
        }
      } catch {
        return;
      } finally {
        setBusyItem(null);
      }
    }
    if (slot.kind === "hp") setHpSlot(slot.index, itemId);
    else if (slot.kind === "mp") setMpSlot(itemId);
    else setStatusSlot(slot.index, itemId);
    setOpenSlot(null);
  };

  const liveBuffs = (props.activeBuffs || []).filter((b) => Date.parse(b.expiresAt) > props.now);

  const isSameSlot = (a: ActiveSlotKey | null, b: ActiveSlotKey) =>
    !!a && a.kind === b.kind && a.index === b.index;

  const toggleSlot = (s: ActiveSlotKey) => {
    setOpenSlot((prev) => (isSameSlot(prev, s) ? null : s));
  };

  // Build unified icon slot descriptors: [HP0, MP0, Status0, Status1, Status2, ...ExtraFood]
  const slotDescriptors: Array<{
    key: ActiveSlotKey;
    roleClass: string;
    placeholderIcon: string;
    itemId?: string;
    ownedQty: number;
    barPct: number;
    isCooling: boolean;
    isBuffActive: boolean;
  }> = [];

  // 1. Primary HP slot
  const hp0 = lo.food?.[0]?.itemId;
  const hpOwned0 = hp0 ? props.inventory[hp0] || 0 : 0;
  const hpReadyAt0 = props.foodReadyAt?.[0] || 0;
  const hpCdLeft0 = Math.max(0, hpReadyAt0 - props.now);
  const hpPct0 =
    hpCdLeft0 > 0
      ? Math.min(100, Math.max(0, ((30_000 - Math.min(30_000, hpCdLeft0)) / 30_000) * 100))
      : hpOwned0 <= 0
      ? 0
      : hp0
      ? 100
      : 0;
  slotDescriptors.push({
    key: { kind: "hp", index: 0 },
    roleClass: "hp-slot",
    placeholderIcon: "❤️",
    itemId: hp0,
    ownedQty: hpOwned0,
    barPct: hpPct0,
    isCooling: hpCdLeft0 > 0,
    isBuffActive: false,
  });

  // 2. Primary MP slot
  const mp0 = lo.mp?.[0]?.itemId;
  const mpOwned0 = mp0 ? props.inventory[mp0] || 0 : 0;
  const mpReadyAt0 = props.mpReadyAt?.[0] || 0;
  const mpCdLeft0 = Math.max(0, mpReadyAt0 - props.now);
  const mpPct0 =
    mpCdLeft0 > 0
      ? Math.min(100, Math.max(0, ((20_000 - Math.min(20_000, mpCdLeft0)) / 20_000) * 100))
      : mpOwned0 <= 0
      ? 0
      : mp0
      ? 100
      : 0;
  slotDescriptors.push({
    key: { kind: "mp", index: 0 },
    roleClass: "mp-slot",
    placeholderIcon: "💧",
    itemId: mp0,
    ownedQty: mpOwned0,
    barPct: mpPct0,
    isCooling: mpCdLeft0 > 0,
    isBuffActive: false,
  });

  // 3~5. Three Status Potion slots
  for (let idx = 0; idx < 3; idx++) {
    const stItem = lo.drink?.[idx]?.itemId;
    const def = stItem ? itemById(stItem) : undefined;
    const buffId = def?.effect?.buff?.id;
    const activeBuff = buffId ? liveBuffs.find((b) => b.id === buffId) : undefined;
    const remSec = activeBuff ? Math.max(0, (Date.parse(activeBuff.expiresAt) - props.now) / 1000) : 0;
    const totalDurSec = Number(def?.effect?.buff?.durationSec) || 600;
    const buffPct = activeBuff ? Math.min(100, Math.max(0, (remSec / totalDurSec) * 100)) : 0;
    slotDescriptors.push({
      key: { kind: "status", index: idx },
      roleClass: "status-slot",
      placeholderIcon: "⚡",
      itemId: stItem,
      ownedQty: stItem ? props.inventory[stItem] || 0 : 0,
      barPct: buffPct,
      isCooling: false,
      isBuffActive: !!activeBuff,
    });
  }

  // Optional extra food slots from equipped pouches
  if (counts.food > 1) {
    for (let extraIdx = 1; extraIdx < counts.food; extraIdx++) {
      const fItem = lo.food?.[extraIdx]?.itemId;
      const fOwned = fItem ? props.inventory[fItem] || 0 : 0;
      const rAt = props.foodReadyAt?.[extraIdx] || 0;
      const cdLeft = Math.max(0, rAt - props.now);
      const pct =
        cdLeft > 0
          ? Math.min(100, Math.max(0, ((30_000 - Math.min(30_000, cdLeft)) / 30_000) * 100))
          : fOwned <= 0
          ? 0
          : fItem
          ? 100
          : 0;
      slotDescriptors.push({
        key: { kind: "hp", index: extraIdx },
        roleClass: "hp-slot extra-slot",
        placeholderIcon: "🎒",
        itemId: fItem,
        ownedQty: fOwned,
        barPct: pct,
        isCooling: cdLeft > 0,
        isBuffActive: false,
      });
    }
  }

  // Active buffs that aren't already represented by one of the 3 status slots
  const slottedBuffIds = new Set(
    (lo.drink || [])
      .map((d) => itemById(d.itemId)?.effect?.buff?.id)
      .filter((x): x is string => !!x)
  );
  const extraLiveBuffs = liveBuffs.filter((b) => !slottedBuffIds.has(b.id));

  const currentPickerSlot = openSlot
    ? slotDescriptors.find((s) => isSameSlot(openSlot, s.key))
    : undefined;
  const pickerCandidates =
    openSlot?.kind === "hp"
      ? hpCandidates
      : openSlot?.kind === "mp"
      ? mpCandidates
      : openSlot?.kind === "status"
      ? statusCandidates
      : [];

  return (
    <div
      ref={barRef}
      className={`mwi-potion-bar icon-only${props.inCombat ? " in-combat" : ""}`}
      role="region"
      aria-label="战斗药剂栏"
    >
      <div className="mwi-icon-belt">
        {slotDescriptors.map((slot) => {
          const isOpen = isSameSlot(openSlot, slot.key);
          const equipped = !!slot.itemId;
          const outOfStock = equipped && slot.ownedQty < 1;
          const itemName = slot.itemId ? itemById(slot.itemId)?.name || slot.itemId : "";
          return (
            <button
              key={`${slot.key.kind}-${slot.key.index}`}
              type="button"
              title={equipped ? `${itemName}（数量：${slot.ownedQty}）` : "点击配置药剂"}
              className={`mwi-icon-slot ${slot.roleClass}${equipped ? " equipped" : " empty"}${
                slot.isBuffActive ? " buff-active" : ""
              }${slot.isCooling ? " cooling" : ""}${outOfStock ? " out-of-stock" : ""}${
                isOpen ? " active-open" : ""
              }`}
              onClick={() => toggleSlot(slot.key)}
              onDoubleClick={() => {
                if (slot.itemId && slot.ownedQty > 0) {
                  void handleDrinkNow(slot.itemId);
                }
              }}
            >
              {slot.itemId ? (
                <T1ItemIcon itemId={slot.itemId} fallback={props.iconOf(slot.itemId)} alt="" />
              ) : (
                <span className="mwi-icon-placeholder" aria-hidden="true">
                  {slot.placeholderIcon}
                </span>
              )}
              {equipped && (
                <span
                  className={`mwi-slot-dot${
                    outOfStock ? " empty" : slot.isBuffActive ? " buff" : slot.isCooling ? " cooling" : " ready"
                  }`}
                  aria-hidden="true"
                />
              )}
              {equipped && (
                <span className={`mwi-icon-slot-qty${outOfStock ? " zero" : ""}`}>
                  {slot.ownedQty}
                </span>
              )}
              <span className="mwi-slot-cd-bar" aria-hidden="true">
                <span
                  className={`mwi-slot-cd-fill ${
                    slot.key.kind === "hp" ? "hp" : slot.key.kind === "mp" ? "mp" : "status"
                  }`}
                  style={{ width: `${slot.barPct}%` }}
                />
              </span>
            </button>
          );
        })}

        {/* 额外生效中的增益纯图标指示 */}
        {extraLiveBuffs.map((b) => {
          const srcDef = itemById(b.sourceItemId);
          const totalDurMs = Math.max(1000, (Number(srcDef?.effect?.buff?.durationSec) || 600) * 1000);
          const remMs = Math.max(0, Date.parse(b.expiresAt) - props.now);
          const pct = Math.max(0, Math.min(100, (remMs / totalDurMs) * 100));
          return (
            <div key={b.id} className="mwi-icon-slot buff-only buff-active">
              <T1ItemIcon itemId={b.sourceItemId} fallback={props.iconOf(b.sourceItemId)} alt="" />
              <span className="mwi-slot-dot buff" aria-hidden="true" />
              <span className="mwi-slot-cd-bar" aria-hidden="true">
                <span className="mwi-slot-cd-fill status" style={{ width: `${pct}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      {/* 点击槽位后弹出的纯图标选择器与操作栏 */}
      {openSlot && currentPickerSlot && (
        <div className="mwi-icon-picker" role="menu">
          {currentPickerSlot.itemId && (
            <div className="mwi-icon-picker-actions">
              <button
                type="button"
                className="mwi-icon-act-btn drink"
                disabled={currentPickerSlot.ownedQty < 1 || busyItem === currentPickerSlot.itemId}
                onClick={() => {
                  void handleDrinkNow(currentPickerSlot.itemId!);
                  setOpenSlot(null);
                }}
              >
                <span aria-hidden="true">🧪</span>
              </button>
              {props.onQuickBuyPotion && (
                <button
                  type="button"
                  className="mwi-icon-act-btn buy"
                  disabled={busyItem === currentPickerSlot.itemId}
                  onClick={async () => {
                    const id = currentPickerSlot.itemId!;
                    setBusyItem(id);
                    try {
                      await props.onQuickBuyPotion!(id, 1);
                    } finally {
                      setBusyItem(null);
                    }
                  }}
                >
                  <span aria-hidden="true">🛒</span>
                </button>
              )}
              <button
                type="button"
                className="mwi-icon-act-btn clear"
                onClick={() => {
                  if (openSlot.kind === "hp") setHpSlot(openSlot.index, "");
                  else if (openSlot.kind === "mp") setMpSlot("");
                  else setStatusSlot(openSlot.index, "");
                  setOpenSlot(null);
                }}
              >
                <span aria-hidden="true">🚫</span>
              </button>
            </div>
          )}

          <div className="mwi-icon-picker-grid">
            {pickerCandidates.map((it) => {
              const owned = props.inventory[it.id] || 0;
              const isSelected = currentPickerSlot.itemId === it.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  title={`${it.name}（数量：${owned}）`}
                  className={`mwi-picker-item${isSelected ? " selected" : ""}${
                    owned < 1 ? " unowned" : ""
                  }`}
                  disabled={busyItem === it.id || (owned < 1 && !props.onQuickBuyPotion)}
                  onClick={() => void handleSelectCandidate(openSlot, it.id)}
                >
                  <T1ItemIcon itemId={it.id} fallback={props.iconOf(it.id)} alt="" />
                  <span
                    className={`mwi-slot-dot ${owned > 0 ? "ready" : "empty"}`}
                    aria-hidden="true"
                  />
                  <span className={`mwi-icon-slot-qty${owned < 1 ? " zero" : ""}`}>
                    {owned}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
