import { useEffect, useState } from "react";
import { T1Art } from "./T1Art";
import { abilityEmoji, describeTrigger } from "./AbilityBar";
import {
  BOOK_REREAD_XP,
  abilityCastXp,
  abilityEffectiveCooldownMs,
  abilityMasteryTier,
  getAbilityXpForLevel,
} from "../gameplay/fightPreview";
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

const TRIGGER_OPTIONS: Array<{
  key: string;
  label: string;
  make: (pct: number) => AbilityTrigger;
  needsPct?: boolean;
  needsCount?: boolean;
}> = [
  { key: "always", label: "冷却好了就放", make: () => ({ type: "always" }) },
  { key: "enemy_hp_below", label: "敌人生命 ≤", make: (pct) => ({ type: "enemy_hp_below", pct }), needsPct: true },
  { key: "self_hp_below", label: "自己生命 ≤", make: (pct) => ({ type: "self_hp_below", pct }), needsPct: true },
  { key: "ally_hp_below", label: "任意队友生命 ≤", make: (pct) => ({ type: "ally_hp_below", pct }), needsPct: true },
  { key: "enemies_at_least", label: "敌方数量 ≥", make: (pct) => ({ type: "enemies_at_least", pct }), needsCount: true },
  { key: "enemy_guard", label: "敌人格挡时", make: () => ({ type: "enemy_guard" }) },
];
const PCT_PRESETS = [25, 50, 75];
const COUNT_PRESETS = [1, 2, 3, 4];

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
              {cur && def && (() => {
                const st = props.known?.[def.id] || { level: 1, xp: 0 };
                const lv = st.level || 1;
                const xp = Math.round((st.xp || 0) * 10) / 10;
                const nextXp = getAbilityXpForLevel(lv);
                const xpPct = Number.isFinite(nextXp) && nextXp > 0 ? Math.min(100, Math.max(0, Math.round((xp / nextXp) * 100))) : 100;
                const mastery = abilityMasteryTier(lv);
                const effCdSec = (abilityEffectiveCooldownMs(def, lv) / 1000).toFixed(1);
                const step = def.levelStep ?? 0.05;
                const curBonusPct = Math.round(Math.max(0, lv - 1) * step * 100);
                const nextBonusPct = Math.round(lv * step * 100);
                const castXp = abilityCastXp(def, 1);
                return (
                <div className="ability-slot-trigger" role="group" aria-label={`${def.name} 触发条件`}>
                  <div className="ability-level-summary-row">
                    <span className="ability-level-pill">Lv.{lv} · {mastery.title}</span>
                    <span className="ability-xp-numbers">EXP {xp} / {nextXp} ({xpPct}%)</span>
                    <span className="ability-cast-gain">每次释放 +{castXp}+ EXP</span>
                  </div>
                  <div className="ability-xp-track" aria-label="技能升级进度">
                    <div className="ability-xp-fill" style={{ width: `${xpPct}%` }} />
                  </div>
                  <div className="ability-growth-line">
                    <span>当前：威力 +{curBonusPct}% · 冷却 {effCdSec}s{mastery.cdReductionPct > 0 ? ` (-${mastery.cdReductionPct}%)` : ""}</span>
                    <span className="ability-growth-next">下一级 Lv.{lv + 1}：威力 +{nextBonusPct}%{(lv + 1) % 5 === 0 ? " · 突破缩减冷却 -2.5%" : ""}</span>
                  </div>
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
                    {TRIGGER_OPTIONS.find((o) => o.key === triggerKey)?.needsCount && (
                      <span className="ability-trigger-pct">
                        {COUNT_PRESETS.map((c) => (
                          <button key={c} type="button" className={`qty-chip${pct === c ? " active" : ""}`} onClick={() => setTrigger(i, triggerKey, c)}>
                            {c}只
                          </button>
                        ))}
                      </span>
                    )}
                    <span className="ability-trigger-summary">→ {describeTrigger(cur.trigger)}</span>
                  </div>
                </div>
                );
              })()}
            </div>
          );
        })}
      </div>
      <div className="ability-mastery-roster">
        <div className="ability-roster-head">
          <span>📖 技能等级与熟练度体系</span>
          <small>战斗释放增长经验 · 重读技能书固定 +{BOOK_REREAD_XP} EXP · 每升 1 级威力 +5%，每 5 级突破缩短 2.5% 冷却</small>
        </div>
        <div className="ability-roster-grid">
          {catalog.map((d) => {
            const st = props.known?.[d.id];
            const isLearned = Boolean(st);
            const lv = st?.level || 1;
            const xp = Math.round((st?.xp || 0) * 10) / 10;
            const nextXp = getAbilityXpForLevel(lv);
            const xpPct = isLearned && Number.isFinite(nextXp) && nextXp > 0 ? Math.min(100, Math.round((xp / nextXp) * 100)) : 0;
            const mastery = abilityMasteryTier(lv);
            return (
              <div key={d.id} className={`ability-roster-card${isLearned ? " is-learned" : " is-locked"}`}>
                <div className="ability-roster-top">
                  <span className="ability-roster-icon">
                    <T1Art kind="skills" id={d.id} fallback={abilityEmoji(d.id)} alt="" />
                  </span>
                  <div className="ability-roster-title">
                    <strong>{d.name}</strong>
                    {isLearned ? (
                      <span className="ability-level-pill">Lv.{lv} · {mastery.title}</span>
                    ) : (
                      <span className="ability-locked-pill">未习得（技能书 0.1%~0.5% 掉落）</span>
                    )}
                  </div>
                </div>
                {isLearned ? (
                  <>
                    <div className="ability-xp-track">
                      <div className="ability-xp-fill" style={{ width: `${xpPct}%` }} />
                    </div>
                    <div className="ability-roster-meta">
                      <span>经验 {xp}/{nextXp} ({xpPct}%)</span>
                      <span>释放 +{abilityCastXp(d, 1)} · 技能书 +{BOOK_REREAD_XP}</span>
                    </div>
                  </>
                ) : (
                  <div className="ability-roster-meta">
                    <span>{d.blurb}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {learned.length <= 1 && (
        <div className="loadout-hint">技能书从怪物身上稀有掉落（基准爆率 0.5%：史莱姆掉《猛击》· 小猴掉《小治疗》· 寄居蟹掉《坚守》），在背包点"阅读"学会，重读固定获得 +{BOOK_REREAD_XP} 技能经验。</div>
      )}
      {learned.length > totalSlots && (
        <div className="loadout-hint">已学会 {learned.length} 个技能，但只有 {totalSlots} 格。提升智力可解锁更多格子。</div>
      )}
    </section>
  );
}
