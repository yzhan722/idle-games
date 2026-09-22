import { useEffect, useState } from "react";
import { T1ItemIcon } from "./T1Art";

type PackItem = {
  id: string;
  name: string;
  type?: string;
  foodSlots?: number;
  drinkSlots?: number;
  effect?: { hp?: number; mp?: number; buff?: { id: string; name: string; durationSec?: number; multipliers?: Record<string, number>; stats?: Record<string, number> } };
};

export type CombatLoadout = {
  food: Array<{ itemId: string; triggerMissingHp: number }>;
  drink: Array<{ itemId: string }>;
  autoRepeat?: boolean;
};

type Props = {
  loadout: CombatLoadout | undefined;
  items: PackItem[] | undefined;
  inventory: Record<string, number>;
  equipment: Record<string, unknown> | undefined;
  playerMaxHp: number;
  iconOf: (itemId: string) => string;
  onChange: (next: CombatLoadout) => void;
  compact?: boolean;
};

const TRIGGER_PRESETS = [0.25, 0.5, 0.75];
const BASE_SLOTS = 1;
const SLOT_CAP = 3;

/** Mirrors backend combatSlotCounts: 1 base + pouch accessories, capped at 3. */
export function slotCounts(equipment: Record<string, unknown> | undefined, items: PackItem[] | undefined): { food: number; drink: number } {
  let food = BASE_SLOTS;
  let drink = BASE_SLOTS;
  for (const [slot, itemId] of Object.entries(equipment || {})) {
    if (typeof itemId !== "string" || slot === "enhancementLevels" || slot === "durability" || slot === "maxDurability") continue;
    const def = items?.find((i) => i.id === itemId);
    food += Number(def?.foodSlots || 0);
    drink += Number(def?.drinkSlots || 0);
  }
  return { food: Math.min(SLOT_CAP, food), drink: Math.min(SLOT_CAP, drink) };
}

/**
 * MWI-style consumable slots for combat. Food slots eat when missing HP ≥ trigger (30s cooldown each),
 * drink slots keep their buff up, plus the auto-repeat toggle. Slot count comes from equipped pouches.
 * Only items the player owns are offered, so the panel doubles as "what do I have that helps in a fight".
 */
export function CombatLoadoutPanel(props: Props) {
  // Optimistic local copy: the server round-trip takes a moment and a controlled control that
  // does not move on click feels broken. Re-synced whenever the server loadout changes.
  const [lo, setLo] = useState<CombatLoadout>(props.loadout || { food: [], drink: [], autoRepeat: false });
  const serverKey = JSON.stringify(props.loadout || null);
  useEffect(() => {
    setLo(props.loadout || { food: [], drink: [], autoRepeat: false });
  }, [serverKey]);

  const counts = slotCounts(props.equipment, props.items);
  const owned = (pred: (i: PackItem) => boolean) =>
    (props.items || []).filter((i) => (i.type === "consumable" || i.type === "food") && (props.inventory[i.id] || 0) > 0 && pred(i));
  const foods = owned((i) => Number(i.effect?.hp) > 0);
  const drinks = owned((i) => !!i.effect?.buff);
  const defaultTrigger = Math.max(1, Math.round(props.playerMaxHp * 0.5));
  const describeBuff = (d?: PackItem) => {
    const b = d?.effect?.buff;
    if (!b) return "";
    const parts: string[] = [];
    for (const [k, v] of Object.entries(b.multipliers || {})) {
      const label = k === "combatSpeed" ? "攻速" : k === "xpGain" ? "经验" : k === "goldGain" ? "金币" : k === "gatherSpeed" ? "采集" : k === "craftSpeed" ? "制作" : k;
      parts.push(`${label} +${Math.round((Number(v) - 1) * 100)}%`);
    }
    for (const [k, v] of Object.entries(b.stats || {})) parts.push(`${k === "atk" ? "攻击" : k === "def" ? "防御" : k} +${v}`);
    return parts.join(" · ") + (b.durationSec ? ` · ${Math.round(b.durationSec / 60)} 分钟` : "");
  };
  const update = (patch: Partial<CombatLoadout>) => {
    const next = { ...lo, ...patch };
    setLo(next);
    props.onChange(next);
  };
  const setFood = (i: number, itemId: string, trigger?: number) => {
    const food = [...lo.food];
    if (!itemId) food.splice(i, 1);
    else food[i] = { itemId, triggerMissingHp: trigger ?? food[i]?.triggerMissingHp ?? defaultTrigger };
    update({ food: food.filter(Boolean) });
  };
  const setDrink = (i: number, itemId: string) => {
    const drink = [...lo.drink];
    if (!itemId) drink.splice(i, 1);
    else drink[i] = { itemId };
    update({ drink: drink.filter(Boolean) });
  };

  return (
    <section className={`combat-loadout${props.compact ? " compact" : ""}`} aria-label="战斗配置">
      <div className="loadout-slot">
        <div className="loadout-slot-head">
          <span className="loadout-slot-title">🍖 食物槽 <small>{counts.food}/{SLOT_CAP}</small></span>
          <span className="loadout-slot-sub">缺血到阈值就吃，每格 30 秒一次{counts.food < SLOT_CAP ? " · 布袋饰品可加格" : ""}</span>
        </div>
        <div className="loadout-slot-body">
          {Array.from({ length: counts.food }).map((_, i) => {
            const cur = lo.food[i];
            const def = cur ? props.items?.find((x) => x.id === cur.itemId) : undefined;
            const trigger = cur?.triggerMissingHp || defaultTrigger;
            return (
              <div className="loadout-row" key={`food-${i}`}>
                <select
                  className="loadout-select"
                  value={cur?.itemId || ""}
                  onChange={(e) => setFood(i, e.target.value)}
                  aria-label={`食物 ${i + 1}`}
                >
                  <option value="">（空）</option>
                  {foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ×{props.inventory[f.id]} · 恢复 {f.effect?.hp}
                    </option>
                  ))}
                  {cur && !foods.some((f) => f.id === cur.itemId) && <option value={cur.itemId}>{def?.name || cur.itemId}（没有了）</option>}
                </select>
                {cur && (
                  <div className="loadout-trigger" role="group" aria-label="触发阈值">
                    <span>缺血 ≥</span>
                    {TRIGGER_PRESETS.map((p) => {
                      const v = Math.max(1, Math.round(props.playerMaxHp * p));
                      return (
                        <button key={p} type="button" className={`qty-chip${trigger === v ? " active" : ""}`} onClick={() => setFood(i, cur.itemId, v)}>
                          {v}
                        </button>
                      );
                    })}
                    <input
                      type="number"
                      className="quantity-input qty-custom"
                      min={1}
                      max={props.playerMaxHp}
                      value={trigger}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (Number.isFinite(v) && v > 0) setFood(i, cur.itemId, Math.min(props.playerMaxHp, v));
                      }}
                      aria-label="自定义阈值"
                    />
                  </div>
                )}
              </div>
            );
          })}
          {foods.length === 0 && lo.food.length === 0 && <div className="loadout-hint">背包里没有能恢复生命的食物或药水。烹饪 / 炼金可以做。</div>}
        </div>
      </div>

      <div className="loadout-slot">
        <div className="loadout-slot-head">
          <span className="loadout-slot-title">🧪 饮品槽 <small>{counts.drink}/{SLOT_CAP}</small></span>
          <span className="loadout-slot-sub">增益掉了就自动再喝</span>
        </div>
        <div className="loadout-slot-body">
          {Array.from({ length: counts.drink }).map((_, i) => {
            const cur = lo.drink[i];
            const def = cur ? props.items?.find((x) => x.id === cur.itemId) : undefined;
            return (
              <div className="loadout-row" key={`drink-${i}`}>
                <select className="loadout-select" value={cur?.itemId || ""} onChange={(e) => setDrink(i, e.target.value)} aria-label={`饮品 ${i + 1}`}>
                  <option value="">（空）</option>
                  {drinks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ×{props.inventory[d.id]}
                    </option>
                  ))}
                  {cur && !drinks.some((d) => d.id === cur.itemId) && <option value={cur.itemId}>{def?.name || cur.itemId}（没有了）</option>}
                </select>
                {def && <div className="loadout-hint good">{describeBuff(def)}</div>}
              </div>
            );
          })}
          {drinks.length === 0 && lo.drink.length === 0 && <div className="loadout-hint">背包里没有增益饮品。狂战药剂 +20 攻击对 Boss 很有用。</div>}
        </div>
      </div>

      <label className="loadout-toggle">
        <input type="checkbox" checked={!!lo.autoRepeat} onChange={(e) => update({ autoRepeat: e.target.checked })} />
        <span>
          <strong>连续战斗</strong>
          <small>胜利后 3 秒自动再打同一只，离线也继续（有食物才安全）；拖得久怪物会狂暴</small>
        </span>
      </label>
      {(lo.food.length > 0 || lo.drink.length > 0) && (
        <div className="loadout-summary">
          {lo.food.map((f) => {
            const d = props.items?.find((x) => x.id === f.itemId);
            return (
              <span className="loadout-chip" key={`c-${f.itemId}`}>
                <T1ItemIcon itemId={f.itemId} fallback={props.iconOf(f.itemId)} alt="" /> {d?.name || f.itemId} · 缺血 {f.triggerMissingHp} 时吃
              </span>
            );
          })}
          {lo.drink.map((dr) => {
            const d = props.items?.find((x) => x.id === dr.itemId);
            return (
              <span className="loadout-chip" key={`d-${dr.itemId}`}>
                <T1ItemIcon itemId={dr.itemId} fallback={props.iconOf(dr.itemId)} alt="" /> {d?.name || dr.itemId}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
