import { useEffect, useRef, useState } from "react";
import { T1Art } from "./T1Art";
import type { ActiveSetBonus } from "../gameplay/combatSheet";
import { xpProgress } from "../gameplay/xp";
import "./T1UiIcons.css";

export type CombatSkillRow = { id: string; name: string; blurb: string; level: number; xp: number };

type Props = {
  playerName: string;
  /** MWI total level: every skill row added up. */
  totalLevel: number;
  combatLevel: number;
  sheet: { hp: number; atk: number; def: number; mp?: number; intervalMs?: number };
  /** MWI combat skills, in display order. */
  combatSkills?: CombatSkillRow[];
  /** The damage skill the equipped weapon trains (gets the 主修 tag). */
  mainSkill?: string;
  /** Skill an equipped charm focuses the 70% share on, if any. */
  focusSkill?: string;
  /** Learned abilities with level, for the sheet's skill summary. */
  abilities?: Array<{ id: string; name: string; level: number; equipped: boolean }>;
  /** Every equipment slot (MWI paperdoll): main / off hand, head … tool. */
  slots: EquipSlotView[];
  onOpenSlot: (slotId: string) => void;
  setBonuses?: ActiveSetBonus[];
  wood: number;
  lumber: number;
  onOpenInventory: () => void;
};

export type EquipSlotView = {
  id: string;
  name: string;
  /** Accessible name when two slots share a label (饰品 1 / 饰品 2). */
  ariaLabel?: string;
  itemId?: string;
  itemName: string;
  /** True when the slot is empty but the bag holds something that fits it. */
  available: boolean;
  /** e.g. "伐木速度 +20%" for the tool slot. */
  effect?: string;
  hint?: string;
};

/** Flashes the value and shows a "+N" chip for ~1.2s whenever a stat changes. */
function StatBox(props: { icon: "stat-hp" | "stat-atk" | "stat-def"; label: string; value: number }) {
  const prev = useRef(props.value);
  const [delta, setDelta] = useState<number | null>(null);
  useEffect(() => {
    const diff = props.value - prev.current;
    prev.current = props.value;
    if (diff === 0) return;
    setDelta(diff);
    const t = window.setTimeout(() => setDelta(null), 1200);
    return () => window.clearTimeout(t);
  }, [props.value]);
  return (
    <div className={`sheet-stat${delta !== null ? (delta > 0 ? " stat-up" : " stat-down") : ""}`}>
      <span className="sheet-stat-label">
        <T1Art kind="ui" id={props.icon} alt="" />
        {props.label}
      </span>
      <strong className="sheet-stat-value">{props.value}</strong>
      {delta !== null && (
        <span className={`sheet-stat-delta ${delta > 0 ? "up" : "down"}`}>
          {delta > 0 ? `+${delta}` : `${delta}`}
        </span>
      )}
    </div>
  );
}

export function CharacterSheet(props: Props) {
  return (
    <section className="character-sheet" aria-label="角色">
      <h2 className="section-title">角色</h2>
      <div className="sheet-hero">
        <div className="sheet-portrait">
          <T1Art kind="character" id="woodcutter" alt="伐木工" />
        </div>
        <p className="sheet-identity">
          {props.playerName} · 总等级 {props.totalLevel} · 战斗 Lv.{props.combatLevel}
        </p>
      </div>
      <div className="sheet-stats">
        <StatBox icon="stat-hp" label="生命" value={props.sheet.hp} />
        <StatBox icon="stat-atk" label="攻击" value={props.sheet.atk} />
        <StatBox icon="stat-def" label="防御" value={props.sheet.def} />
      </div>
      {(props.sheet.mp !== undefined || props.sheet.intervalMs !== undefined) && (
        <p className="sheet-secondary-stats">
          {props.sheet.mp !== undefined && <span>魔力 {props.sheet.mp}</span>}
          {props.sheet.intervalMs !== undefined && <span>攻击间隔 {(props.sheet.intervalMs / 1000).toFixed(2)}s</span>}
        </p>
      )}
      {props.combatSkills && props.combatSkills.length > 0 && (
        <div className="sheet-combat-skills" aria-label="战斗技能">
          <div className="sheet-block-title">
            战斗技能{" "}
            <small>
              {props.focusSkill
                ? `每次击杀：30% 给武器主修，70% 全给护符指定的「${props.combatSkills.find((s) => s.id === props.focusSkill)?.name || props.focusSkill}」`
                : "每次击杀：30% 给武器主修，70% 由耐力 / 智力 / 攻击 / 防御 / 主修平分；换弓或法杖就改练远程 / 魔法，戴训练护符可把 70% 集中到一条"}
            </small>
          </div>
          <div className="sheet-skill-grid">
            {props.combatSkills.map((s) => {
              const prog = xpProgress(s.level, s.xp);
              const isMain = props.mainSkill === s.id;
              const isFocus = props.focusSkill === s.id;
              return (
                <div className={`sheet-skill${isMain ? " main" : ""}${isFocus ? " focus" : ""}`} key={s.id} data-combat-skill={s.id}>
                  <div className="sheet-skill-head">
                    <span className="sheet-skill-name">
                      {s.name}
                      {isMain ? <em className="sheet-skill-main">主修</em> : null}
                      {isFocus ? <em className="sheet-skill-main sheet-skill-focus">护符</em> : null}
                    </span>
                    <span className="sheet-skill-level">Lv.{s.level}</span>
                  </div>
                  <span className="skill-xp-bar" aria-hidden="true">
                    <span className="skill-xp-fill" style={{ width: `${Math.min(100, Math.max(0, prog.pct))}%` }} />
                  </span>
                  <small className="sheet-skill-blurb">
                    {s.blurb} · {Math.floor(s.xp)}/{Number.isFinite(prog.need) ? prog.need : "MAX"} XP
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {props.abilities && props.abilities.length > 0 && (
        <p className="sheet-abilities">
          技能：
          {props.abilities.map((a) => (
            <span key={a.id} className={`ability-chip${a.equipped ? " equipped" : ""}`}>
              {a.name} Lv.{a.level}{a.equipped ? "" : "（未装备）"}
            </span>
          ))}
        </p>
      )}
      {props.setBonuses && props.setBonuses.length > 0 && (
        <p className="sheet-set-bonus">
          {props.setBonuses.map((b) => (
            <span key={b.setId}>
              套装 · {b.name} {b.pieces} 件：
              {b.atk ? ` 攻击 +${b.atk}` : ""}
              {b.def ? ` 防御 +${b.def}` : ""}
            </span>
          ))}
        </p>
      )}
      <div className="sheet-gear sheet-gear-full">
        {props.slots.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`sheet-slot${s.available ? " slot-available" : ""}${s.itemId ? " filled" : ""}${s.id === "tool" ? " sheet-slot-tool" : ""}`}
            aria-label={s.ariaLabel || s.name}
            data-slot-id={s.id}
            onClick={() => props.onOpenSlot(s.id)}
          >
            <span>{s.name}{s.available ? <em className="slot-hint">背包里有可装备的</em> : null}</span>
            {s.itemId ? <T1Art kind="equipment" id={s.itemId} fallback={s.id === "tool" ? "🪓" : "◈"} alt="" /> : null}
            <strong>{s.itemName || "空"}</strong>
            {(s.effect || s.hint) && <small className="slot-effect">{s.itemId ? s.effect : s.hint}</small>}
          </button>
        ))}
      </div>
      <div className="sheet-pack">
        <p className="sheet-pack-line">
          <T1Art kind="materials" id="wood_1" alt="" />
          <span>原木 {props.wood}</span>
          <T1Art kind="materials" id="lumber_1" alt="" />
          <span>木板 {props.lumber}</span>
        </p>
        <button type="button" className="header-menu-btn" onClick={props.onOpenInventory}>
          打开背包
        </button>
      </div>
    </section>
  );
}
