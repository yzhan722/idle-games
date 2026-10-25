import { useEffect, useState } from "react";
import { T1ItemIcon } from "./T1Art";

type PackItem = {
  id: string;
  name: string;
  type?: string;
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

export type CombatLoadout = {
  food: Array<{ itemId: string; triggerMissingHp: number }>;
  drink: Array<{ itemId: string; triggerMissingMp?: number }>;
  mp?: Array<{ itemId: string; triggerMissingMp: number }>;
  autoRepeat?: boolean;
};

type Props = {
  loadout: CombatLoadout | undefined;
  items: PackItem[] | undefined;
  inventory: Record<string, number>;
  equipment: Record<string, unknown> | undefined;
  playerMaxHp: number;
  playerMaxMp?: number;
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
 * MP slot drinks when missing MP ≥ trigger (20s cooldown), and drink slots keep their status buff up.
 */
export function CombatLoadoutPanel(props: Props) {
  const [lo, setLo] = useState<CombatLoadout>(props.loadout || { food: [], drink: [], mp: [], autoRepeat: false });
  const serverKey = JSON.stringify(props.loadout || null);
  useEffect(() => {
    setLo(props.loadout || { food: [], drink: [], mp: [], autoRepeat: false });
  }, [serverKey]);

  const counts = slotCounts(props.equipment, props.items);
  const owned = (pred: (i: PackItem) => boolean) =>
    (props.items || []).filter((i) => (i.type === "consumable" || i.type === "food") && (props.inventory[i.id] || 0) > 0 && pred(i));
  const foods = owned((i) => Number(i.effect?.hp) > 0);
  const mpPotions = owned((i) => Number(i.effect?.mp) > 0);
  const drinks = owned((i) => !!i.effect?.buff);
  const defaultTrigger = Math.max(1, Math.round(props.playerMaxHp * 0.5));
  const maxMp = Math.max(20, props.playerMaxMp || 50);
  const defaultMpTrigger = Math.max(1, Math.round(maxMp * 0.4));
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
  const setMp = (itemId: string, trigger?: number) => {
    if (!itemId) update({ mp: [] });
    else update({ mp: [{ itemId, triggerMissingMp: trigger ?? lo.mp?.[0]?.triggerMissingMp ?? defaultMpTrigger }] });
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
          <span className="loadout-slot-title">❤️ 生命药剂 / 食物槽 <small>{counts.food}/{SLOT_CAP}</small></span>
          <span className="loadout-slot-sub">缺血到阈值就喝，每格 30 秒一次{counts.food < SLOT_CAP ? " · 布袋饰品可加格" : ""}</span>
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
          {foods.length === 0 && lo.food.length === 0 && <div className="loadout-hint">背包里没有能恢复生命的食物或药水。商店 / 烹饪 / 炼金可获取。</div>}
        </div>
      </div>

      <div className="loadout-slot">
        <div className="loadout-slot-head">
          <span className="loadout-slot-title">💧 魔力药剂槽 <small>1/1</small></span>
          <span className="loadout-slot-sub">缺蓝达到阈值自动补充魔力（20秒冷却）</span>
        </div>
        <div className="loadout-slot-body">
          {(() => {
            const curMp = lo.mp?.[0];
            const def = curMp ? props.items?.find((x) => x.id === curMp.itemId) : undefined;
            const trigger = curMp?.triggerMissingMp || defaultMpTrigger;
            return (
              <div className="loadout-row">
                <select
                  className="loadout-select"
                  value={curMp?.itemId || ""}
                  onChange={(e) => setMp(e.target.value)}
                  aria-label="魔力药剂"
                >
                  <option value="">（空）</option>
                  {mpPotions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ×{props.inventory[m.id]} · 恢复 {m.effect?.mp} 魔力
                    </option>
                  ))}
                  {curMp && !mpPotions.some((m) => m.id === curMp.itemId) && <option value={curMp.itemId}>{def?.name || curMp.itemId}（没有了）</option>}
                </select>
                {curMp && (
                  <div className="loadout-trigger" role="group" aria-label="缺蓝触发阈值">
                    <span>缺蓝 ≥</span>
                    {[0.3, 0.5, 0.75].map((p) => {
                      const v = Math.max(1, Math.round(maxMp * p));
                      return (
                        <button key={p} type="button" className={`qty-chip${trigger === v ? " active" : ""}`} onClick={() => setMp(curMp.itemId, v)}>
                          {v}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="loadout-slot">
        <div className="loadout-slot-head">
          <span className="loadout-slot-title">🧪 状态药剂槽 <small>3/{SLOT_CAP}</small></span>
          <span className="loadout-slot-sub">进入战斗或增益到期时自动续杯（狂战 / 铁壁 / 奥术涌流 / 守护战意）</span>
        </div>
        <div className="loadout-slot-body">
          {Array.from({ length: SLOT_CAP }).map((_, i) => {
            const cur = lo.drink[i];
            const def = cur ? props.items?.find((x) => x.id === cur.itemId) : undefined;
            return (
              <div className="loadout-row" key={`drink-${i}`}>
                <select className="loadout-select" value={cur?.itemId || ""} onChange={(e) => setDrink(i, e.target.value)} aria-label={`状态药剂 ${i + 1}`}>
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
          {drinks.length === 0 && lo.drink.length === 0 && <div className="loadout-hint">背包里没有状态药剂。狂战药剂(+20攻)、铁壁药剂(+18防)、奥术涌流药剂对战斗很有帮助。</div>}
        </div>
      </div>

      <label className="loadout-toggle">
        <input type="checkbox" checked={!!lo.autoRepeat} onChange={(e) => update({ autoRepeat: e.target.checked })} />
        <span>
          <strong>连续战斗</strong>
          <small>胜利后 3 秒自动再打同一只，离线也继续（有食物才安全）；拖得久怪物会狂暴</small>
        </span>
      </label>
      {(lo.food.length > 0 || (lo.mp?.length || 0) > 0 || lo.drink.length > 0) && (
        <div className="loadout-summary">
          {lo.food.map((f) => {
            const d = props.items?.find((x) => x.id === f.itemId);
            return (
              <span className="loadout-chip" key={`c-${f.itemId}`}>
                <T1ItemIcon itemId={f.itemId} fallback={props.iconOf(f.itemId)} alt="" /> {d?.name || f.itemId} · 缺血 {f.triggerMissingHp} 时喝
              </span>
            );
          })}
          {(lo.mp || []).map((m) => {
            const d = props.items?.find((x) => x.id === m.itemId);
            return (
              <span className="loadout-chip" key={`m-${m.itemId}`}>
                <T1ItemIcon itemId={m.itemId} fallback={props.iconOf(m.itemId)} alt="" /> {d?.name || m.itemId} · 缺蓝 {m.triggerMissingMp} 时喝
              </span>
            );
          })}
          {lo.drink.map((dr, idx) => {
            const d = props.items?.find((x) => x.id === dr.itemId);
            return (
              <span className="loadout-chip" key={`d-${dr.itemId}-${idx}`}>
                <T1ItemIcon itemId={dr.itemId} fallback={props.iconOf(dr.itemId)} alt="" /> {d?.name || dr.itemId}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
