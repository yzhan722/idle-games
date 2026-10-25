import { useEffect, useState } from "react";
import { T1Art } from "./T1Art";
import { abilityEmoji, describeTrigger } from "./AbilityBar";
import type { AbilityDef, AbilitySlot, AbilityTrigger } from "../types/game";

type Props = {
  catalog: AbilityDef[] | undefined;
  known: Record<string, { level: number; xp: number }> | undefined;
  loadout: AbilitySlot[] | undefined;
  slotCount: number;
  intelligenceLevel: number;
  onChange: (slots: AbilitySlot[]) => void;
  compact?: boolean;
};

const TRIGGER_OPTIONS: Array<{ key: string; label: string; make: (pct: number) => AbilityTrigger; needsPct?: boolean }> = [
  { key: "always", label: "冷却好了就放", make: () => ({ type: "always" }) },
  { key: "enemy_hp_below", label: "敌人生命 ≤", make: (pct) => ({ type: "enemy_hp_below", pct }), needsPct: true },
  { key: "self_hp_below", label: "自己生命 ≤", make: (pct) => ({ type: "self_hp_below", pct }), needsPct: true },
  { key: "enemy_guard", label: "敌人格挡时", make: () => ({ type: "enemy_guard" }) },
];
const PCT_PRESETS = [25, 50, 75];

/** Intelligence level that unlocks slot index `i` (0-based): 1 + floor(int/10) slots. */
export function slotUnlockLevel(i: number): number {
  return i === 0 ? 1 : i * 10;
}

/**
 * MWI 技能槽: an ordered list of learned abilities, each with the trigger that auto-casts it.
 * Left-to-right is cast priority. Slot count follows intelligence; locked slots say what unlocks them.
 */
export function AbilityLoadoutPanel(props: Props) {
  const [slots, setSlots] = useState<AbilitySlot[]>(props.loadout || []);
  const serverKey = JSON.stringify(props.loadout || null);
  useEffect(() => {
    setSlots(props.loadout || []);
  }, [serverKey]);

  const catalog = props.catalog || [];
  const learned = catalog.filter((d) => props.known?.[d.id]);
  const update = (next: AbilitySlot[]) => {
    setSlots(next);
    props.onChange(next);
  };
  const setAbility = (i: number, abilityId: string) => {
    const next = [...slots];
    if (!abilityId) {
      next.splice(i, 1);
    } else {
      const def = catalog.find((d) => d.id === abilityId);
      const dup = next.findIndex((s, j) => j !== i && s?.abilityId === abilityId);
      const rawPreserved =
        next[i]?.abilityId === abilityId
          ? next[i].trigger
          : dup >= 0 && next[dup]?.trigger
          ? next[dup].trigger
          : def?.defaultTrigger || { type: "always" };
      const canEnemyGuard = Boolean(def?.breaksGuard || def?.damageMult);
      const preservedTrigger =
        rawPreserved.type === "enemy_guard" && !canEnemyGuard
          ? def?.defaultTrigger || { type: "always" }
          : rawPreserved;
      if (dup >= 0) {
        next[dup] = next[i];
      }
      next[i] = { abilityId, trigger: preservedTrigger };
    }
    update(next.filter(Boolean));
  };
  const setTrigger = (i: number, key: string, pct?: number) => {
    const opt = TRIGGER_OPTIONS.find((o) => o.key === key);
    if (!opt || !slots[i]) return;
    const cur = slots[i].trigger;
    const curPct = "pct" in cur ? cur.pct : 50;
    const next = [...slots];
    next[i] = { ...next[i], trigger: opt.make(pct ?? curPct) };
    update(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const totalSlots = Math.max(props.slotCount, 1);
  const rows = Math.max(totalSlots, 4);

  return (
    <section className={`ability-loadout${props.compact ? " compact" : ""}`} aria-label="技能配置">
      <div className="loadout-slot-head">
        <span className="loadout-slot-title">✨ 技能槽 <small>{Math.min(slots.length, totalSlots)}/{totalSlots}</small></span>
        <span className="loadout-slot-sub">从左到右按顺序自动释放；条件满足、冷却好了、魔力够就放。智力每 10 级多一格。</span>
      </div>
      <div className="ability-slots">
        {Array.from({ length: rows }).map((_, i) => {
          const locked = i >= totalSlots;
          const cur = slots[i];
          const def = cur ? catalog.find((d) => d.id === cur.abilityId) : undefined;
          const triggerKey = cur?.trigger.type || "always";
          const pct = cur && "pct" in cur.trigger ? cur.trigger.pct : 50;
          if (locked) {
            return (
              <div className="ability-slot locked" key={`slot-${i}`} data-slot-index={i}>
                <span className="ability-slot-lock">🔒</span>
                <span className="ability-slot-copy">智力 {slotUnlockLevel(i)} 级解锁（当前 {props.intelligenceLevel}）</span>
              </div>
            );
          }
          return (
            <div className={`ability-slot${cur ? "" : " empty"}`} key={`slot-${i}`} data-slot-index={i}>
              <div className="ability-slot-main">
                <span className="ability-slot-icon" aria-hidden="true">
                  {def ? <T1Art kind="skills" id={def.id} fallback={abilityEmoji(def.id)} alt="" /> : <span className="ability-slot-order">{i + 1}</span>}
                </span>
                <select className="loadout-select" value={cur?.abilityId || ""} onChange={(e) => setAbility(i, e.target.value)} aria-label={`技能槽 ${i + 1}`}>
                  <option value="">（空）</option>
                  {learned.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} Lv.{props.known?.[d.id]?.level || 1}{d.mpCost ? ` · ${d.mpCost} 魔力` : ""} · {Math.round(d.cooldownMs / 1000)}s
                    </option>
                  ))}
                </select>
                {cur && (
                  <span className="ability-slot-order-btns">
                    <button type="button" className="qty-chip" onClick={() => move(i, -1)} disabled={i === 0} aria-label="提前">↑</button>
                    <button type="button" className="qty-chip" onClick={() => move(i, 1)} disabled={i >= slots.length - 1} aria-label="推后">↓</button>
                  </span>
                )}
              </div>
              {cur && def && (
                <div className="ability-slot-trigger" role="group" aria-label={`${def.name} 触发条件`}>
                  <span className="ability-slot-blurb">{def.blurb}</span>
                  <div className="ability-trigger-row">
                    <select className="loadout-select trigger-select" value={triggerKey} onChange={(e) => setTrigger(i, e.target.value)} aria-label="触发条件">
                      {TRIGGER_OPTIONS.filter((o) => o.key !== "enemy_guard" || def.breaksGuard || def.damageMult).map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {TRIGGER_OPTIONS.find((o) => o.key === triggerKey)?.needsPct && (
                      <span className="ability-trigger-pct">
                        {PCT_PRESETS.map((p) => (
                          <button key={p} type="button" className={`qty-chip${pct === p ? " active" : ""}`} onClick={() => setTrigger(i, triggerKey, p)}>
                            {p}%
                          </button>
                        ))}
                      </span>
                    )}
                    <span className="ability-trigger-summary">→ {describeTrigger(cur.trigger)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {learned.length <= 1 && (
        <div className="loadout-hint">技能书从森林怪物身上掉落（史莱姆：猛击 · 小猴：小治疗 · 寄居蟹：坚守），在背包里点"阅读"学会。</div>
      )}
      {learned.length > totalSlots && (
        <div className="loadout-hint">已学会 {learned.length} 个技能，但只有 {totalSlots} 格。提升智力可解锁更多格子。</div>
      )}
    </section>
  );
}
