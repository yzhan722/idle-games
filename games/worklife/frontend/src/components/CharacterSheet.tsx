import { useEffect, useRef, useState } from "react";
import { T1Art, characterArtId, normalizeGender, normalizeAvatarId, AVATAR_OPTIONS, PlayerAvatarIcon, GuildFramedAvatar } from "./T1Art";
import { abilityEmoji } from "./AbilityBar";
import { abilityMasteryTier, getAbilityXpForLevel } from "../gameplay/fightPreview";
import type { ActiveSetBonus } from "../gameplay/combatSheet";
import { getProfessionPerk } from "../gameplay/professionPerks";
import "./T1UiIcons.css";

export type CombatSkillRow = { id: string; name: string; blurb: string; level: number; xp: number };

export type CharacterAbilityRow = {
  id: string;
  name: string;
  level: number;
  xp?: number;
  equipped: boolean;
  blurb?: string;
  cooldownMs?: number;
  mpCost?: number;
  damageMult?: number;
  healPct?: number;
  guardMult?: number;
  durationMs?: number;
  breaksGuard?: boolean;
  levelStep?: number;
  /** 伤害 / 治疗 / 减伤 / 回蓝 / 光环里占了不止一样。 */
  multiEffect?: boolean;
  triggerText?: string;
};

function formatAbilityEffect(a: CharacterAbilityRow): string {
  const step = a.levelStep ?? 0.05;
  const mult = 1 + Math.max(0, (a.level || 1) - 1) * step;
  // 不止一种效果的技能写不进一句话，直接用完整说明
  if (a.blurb && a.multiEffect) return a.blurb;
  if (typeof a.damageMult === "number") {
    const dmgPct = Math.round(a.damageMult * mult * 100);
    const dmgRatio = Math.round(a.damageMult * mult * 100) / 100;
    if (a.breaksGuard) {
      return `对目标造成 ${dmgRatio} 倍（${dmgPct}%）普通攻击伤害，无视并直接击碎敌方的格挡状态（每升 1 级伤害提升 +${Math.round(step * 100)}%）。`;
    }
    return `对目标发动强力猛击，造成 ${dmgRatio} 倍（${dmgPct}%）普通攻击伤害（每升 1 级伤害提升 +${Math.round(step * 100)}%）。`;
  }
  if (typeof a.healPct === "number") {
    const healPct = Math.round(a.healPct * mult * 1000) / 10;
    return `立即恢复自身 ${healPct}% 最大生命值（每升 1 级治疗量提升 +${Math.round(step * 100)}%）。`;
  }
  if (typeof a.guardMult === "number") {
    // 单人：升级延长持续时间；组队：升级加强减伤（hp_combat.castAbility / PartyPanel）
    const reducePct = Math.round((1 - a.guardMult) * 100);
    const sec = Math.round(((a.durationMs || 6000) * mult) / 100) / 10;
    return `进入坚守姿态，${sec} 秒内受到的伤害降低 ${reducePct}%（每升 1 级持续时间 +${Math.round(step * 100)}%，组队时改为减伤 +${Math.round(step * 100)}%）。`;
  }
  if (a.blurb) return a.blurb;
  if (a.id === "heavy_chop") {
    return "对目标造成 2.2 倍（220%）普通攻击伤害，无视并直接击碎敌方的格挡状态，不消耗魔力。";
  }
  if (a.id === "smash") {
    return "对目标发动强力猛击，造成 1.6 倍（160%）普通攻击伤害，冷却时间短。";
  }
  if (a.id === "minor_heal") {
    return "立即恢复自身 25% 最大生命值。";
  }
  if (a.id === "brace") {
    return "进入坚守姿态，在 6 秒内受到的所有伤害降低 35%。";
  }
  return "战斗主动技能，在满足触发条件且冷却就绪时自动释放。";
}

type Props = {
  playerName: string;
  activeClassId?: string;
  activeClassName?: string;
  playerGender?: string;
  playerAvatar?: string;
  equippedGuildFrame?: string | null;
  onChangeAvatar?: (avatar: string) => void;
  onOpenProfessionModal?: () => void;
  /** Total level: every skill row added up. */
  totalLevel: number;
  combatLevel: number;
  sheet: {
    hp: number;
    atk: number;
    def: number;
    mp?: number;
    intervalMs?: number;
    accuracy?: number;
    evasion?: number;
    physResist?: number;
    elemResist?: number;
  };
  /** 稀有掉落的最终倍率（服务端算好的）：单人 / 组队。 */
  rareFind?: { solo: number; party: number };
  /** Combat skills, in display order. */
  combatSkills?: CombatSkillRow[];
  /** The damage skill the equipped weapon trains (gets the 主修 tag). */
  mainSkill?: string;
  /** Skill an equipped charm focuses the support share on, if any. */
  focusSkill?: string;
  /** Learned abilities with level and effect details, for the sheet's skill summary. */
  abilities?: CharacterAbilityRow[];
  /** Every equipment slot (paperdoll): main / off hand, head … tool. */
  slots: EquipSlotView[];
  onOpenSlot: (slotId: string) => void;
  onRepairItem?: (itemId: string) => void;
  onRepairAll?: () => void;
  repairingItemId?: string | null;
  setBonuses?: ActiveSetBonus[];
  wood?: number;
  lumber?: number;
  onOpenInventory?: () => void;
};

export type EquipSlotView = {
  id: string;
  name: string;
  /** 槽位类型图标（空槽时显示，让人知道这格放什么） */
  icon?: string;
  /** Accessible name when two slots share a label (饰品 1 / 饰品 2). */
  ariaLabel?: string;
  itemId?: string;
  itemName: string;
  /** True when the slot is empty but the bag holds something that fits it. */
  available: boolean;
  /** e.g. "伐木速度 +20%" for the tool slot. */
  effect?: string;
  hint?: string;
  /** 0–100; only present when the item has durability records (has been worn). */
  durabilityPct?: number;
  /** durability hit 0 — the item contributes nothing until repaired. */
  broken?: boolean;
  /** Gold cost of a full repair (mirrors backend formula). */
  repairCost?: number;
};

/** Empty-slot hand-painted silhouettes so empty gear slots never fall back to raw system emojis. */
const EMPTY_SLOT_EQUIPMENT_ID: Record<string, string> = {
  mainhand: "weapon_iron_sword",
  chest: "armor_cloth_chest",
  legs: "armor_cloth_legs",
  feet: "armor_cloth_boots",
  hands: "armor_cloth_gloves",
  tool: "weapon_logging_axe_t1",
  offhand: "offhand_wooden_shield",
  head: "armor_arcane_sage_hood",
  accessory1: "accessory_frost_ring",
  accessory2: "accessory_arcane_pendant",
};

/** Flashes the value and shows a "+N" chip for ~1.2s whenever a stat changes. */
function StatBox(props: {
  icon: "stat-hp" | "stat-mp" | "stat-atk" | "stat-def" | "stat-spd";
  label: string;
  value: number;
  displayValue?: string;
  invertDelta?: boolean;
}) {
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
  const isPositiveGood = props.invertDelta ? (delta !== null && delta < 0) : (delta !== null && delta > 0);
  return (
    <div className={`sheet-stat${delta !== null ? (isPositiveGood ? " stat-up" : " stat-down") : ""}`}>
      <span className="sheet-stat-label">
        {props.icon === "stat-mp" ? (
          <T1Art kind="item" id="potion_mp_t1" className="t1-art-icon" alt="" />
        ) : props.icon === "stat-spd" ? (
          <T1Art kind="ui" id="nav-ranged" className="t1-art-icon" alt="" />
        ) : (
          <T1Art kind="ui" id={props.icon} alt="" />
        )}
        {props.label}
      </span>
      <strong className="sheet-stat-value">{props.displayValue ?? props.value}</strong>
      {delta !== null && (
        <span className={`sheet-stat-delta ${isPositiveGood ? "up" : "down"}`}>
          {props.invertDelta
            ? `${delta > 0 ? "+" : ""}${(delta / 1000).toFixed(2)}s`
            : delta > 0
            ? `+${delta}`
            : `${delta}`}
        </span>
      )}
    </div>
  );
}

export function CharacterSheet(props: Props) {
  const seenDamagedIds = new Set<string>();
  const damagedSlots = props.slots.filter((s) => {
    if (!s.itemId || s.durabilityPct === undefined || s.durabilityPct >= 100) return false;
    if (seenDamagedIds.has(s.itemId)) return false;
    seenDamagedIds.add(s.itemId);
    return true;
  });
  const totalRepairCost = damagedSlots.reduce((sum, s) => sum + (s.repairCost ?? 0), 0);
  const normalizedGender = normalizeGender(props.playerGender);
  const currentAvatarId = normalizeAvatarId(props.playerAvatar, normalizedGender);
  return (
    <section className="character-sheet" aria-label="角色">
      <h2 className="section-title">角色</h2>
      <div className="sheet-hero">
        <div className="sheet-portrait">
          <T1Art kind="character" id={characterArtId(props.activeClassId, normalizedGender)} alt={props.activeClassName || "伐木工"} />
        </div>
        <div className="sheet-identity-wrap">
          <p className="sheet-identity" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
            {props.equippedGuildFrame ? (
              <GuildFramedAvatar
                avatar={currentAvatarId}
                gender={normalizedGender}
                frameId={props.equippedGuildFrame}
                size={32}
              />
            ) : (
              <span className="sheet-avatar-badge" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", display: "inline-flex", flexShrink: 0, border: "1px solid var(--border-brand, #d9a04a)" }}>
                <PlayerAvatarIcon avatar={currentAvatarId} gender={normalizedGender} />
              </span>
            )}
            <strong style={{ whiteSpace: "nowrap" }}>{props.playerName}</strong>
            {props.activeClassName && <span style={{ whiteSpace: "nowrap", padding: "1px 7px", borderRadius: 999, background: "rgba(217, 160, 74, 0.16)", border: "1px solid rgba(217, 160, 74, 0.36)", fontSize: 12, color: "#f3d299" }}>{props.activeClassName}</span>}
            <span style={{ whiteSpace: "nowrap", fontSize: 12.5, color: "var(--text-secondary)" }}>总等级 {props.totalLevel}</span>
            <span style={{ whiteSpace: "nowrap", fontSize: 12.5, color: "var(--text-secondary)" }}>· 战斗 Lv.{props.combatLevel}</span>
          </p>
          <p className="sheet-class-perk" style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 6px" }}>
            <strong>【{getProfessionPerk(props.activeClassId).traitName}】</strong>{getProfessionPerk(props.activeClassId).combatAndUtilityDesc}
          </p>
          {props.onOpenProfessionModal && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="qty-chip sheet-switch-class-btn" onClick={props.onOpenProfessionModal}>
                切换职业
              </button>
            </div>
          )}
          {props.onChangeAvatar && (
            <div className="sheet-avatar-picker" role="group" aria-label="切换角色头像" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>头像：</span>
              {AVATAR_OPTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => props.onChangeAvatar?.(a.id)}
                  title={`切换头像：${a.label}`}
                  aria-label={`头像 ${a.label}`}
                  aria-pressed={currentAvatarId === a.id}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: "50%",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: currentAvatarId === a.id ? "2px solid var(--border-brand, #d9a04a)" : "1px solid var(--border)",
                    boxShadow: currentAvatarId === a.id ? "0 0 6px rgba(217, 160, 74, 0.55)" : "none",
                    background: "transparent",
                  }}
                >
                  <PlayerAvatarIcon avatar={a.id} gender={a.gender} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="sheet-stats">
        <StatBox icon="stat-hp" label="生命" value={props.sheet.hp} />
        <StatBox icon="stat-mp" label="魔力" value={props.sheet.mp ?? 20} />
        <StatBox icon="stat-atk" label="攻击" value={props.sheet.atk} />
        <StatBox icon="stat-def" label="防御" value={props.sheet.def} />
        <StatBox
          icon="stat-spd"
          label="攻击间隔"
          value={props.sheet.intervalMs ?? 3000}
          displayValue={`${((props.sheet.intervalMs ?? 3000) / 1000).toFixed(2)}s`}
          invertDelta
        />
        <StatBox icon="stat-atk" label="命中" value={props.sheet.accuracy ?? 0} />
        <StatBox icon="stat-def" label="闪避" value={props.sheet.evasion ?? 0} />
        <StatBox icon="stat-def" label="物抗" value={props.sheet.physResist ?? 0} />
        <StatBox icon="stat-def" label="元抗" value={props.sheet.elemResist ?? 0} />
        {props.rareFind && (
          <>
            <StatBox icon="stat-atk" label="珍稀·单人" value={0} displayValue={`×${props.rareFind.solo.toFixed(2)}`} />
            <StatBox icon="stat-atk" label="珍稀·组队" value={0} displayValue={`×${props.rareFind.party.toFixed(2)}`} />
          </>
        )}
      </div>
      {props.abilities && props.abilities.length > 0 && (
        <div className="sheet-abilities" aria-label="战斗技能">
          <div className="sheet-block-title">
            已掌握技能 <small>在冒险页的「配置技能」中可调整出战顺序与自动触发条件</small>
          </div>
          <div className="sheet-ability-list">
            {props.abilities.map((a) => {
              const baseCdMs = a.cooldownMs ?? (a.id === "smash" ? 5000 : a.id === "minor_heal" ? 15000 : a.id === "brace" ? 12000 : 8000);
              const mastery = abilityMasteryTier(a.level || 1);
              const effCdMs = Math.max(1000, Math.round(baseCdMs * (1 - mastery.cdReductionPct / 100)));
              const cdSec = Math.round((effCdMs / 1000) * 10) / 10;
              const mpCost = a.mpCost ?? (a.id === "smash" ? 4 : a.id === "minor_heal" ? 8 : a.id === "brace" ? 6 : 0);
              const xp = Math.round((a.xp || 0) * 10) / 10;
              const nextXp = getAbilityXpForLevel(a.level || 1);
              const xpPct = Number.isFinite(nextXp) && nextXp > 0 ? Math.min(100, Math.max(0, Math.round((xp / nextXp) * 100))) : 100;
              const bonusPct = Math.round(Math.max(0, (a.level || 1) - 1) * (a.levelStep ?? 0.05) * 100);
              return (
                <div key={a.id} className={`sheet-ability-card${a.equipped ? " equipped" : ""}`}>
                  <div className="sheet-ability-icon">
                    <T1Art kind="skills" id={a.id} fallback={abilityEmoji(a.id)} alt={a.name} />
                  </div>
                  <div className="sheet-ability-body">
                    <div className="sheet-ability-head">
                      <strong className="sheet-ability-name">{a.name}</strong>
                      <span className="sheet-ability-level">Lv.{a.level} · {mastery.title}</span>
                      <span className={`sheet-ability-status${a.equipped ? " on" : ""}`}>
                        {a.equipped ? "已装备" : "未装备"}
                      </span>
                      <span className="sheet-ability-meta">
                        <span>冷却 {cdSec}s{mastery.cdReductionPct > 0 ? ` (-${mastery.cdReductionPct}%)` : ""}</span>
                        <span><T1Art kind="item" id="potion_mp_t1" className="gold-inline" alt="" /> {mpCost > 0 ? `${mpCost} 魔力` : "无消耗"}</span>
                        <span><T1Art kind="ui" id="nav-enhance" className="gold-inline" alt="" /> 等级威力 +{bonusPct}%</span>
                        {a.equipped && <span><T1Art kind="ui" id="nav-ranged" className="gold-inline" alt="" /> 触发：{a.triggerText || "冷却好了就放"}</span>}
                      </span>
                    </div>
                    <div className="sheet-ability-xp-row">
                      <div className="ability-xp-track">
                        <div className="ability-xp-fill" style={{ width: `${xpPct}%` }} />
                      </div>
                      <span className="sheet-ability-xp-text">熟练度 {xp} / {nextXp} ({xpPct}%)</span>
                    </div>
                    <p className="sheet-ability-desc">{formatAbilityEffect(a)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {props.setBonuses && props.setBonuses.length > 0 && (
        <p className="sheet-set-bonus">
          {props.setBonuses.map((b: any) => (
            <span key={b.setId}>
              套装 · {b.name} {b.pieces} 件：
              {b.atk ? ` 攻击 +${b.atk}` : ""}
              {b.mag ? ` 魔法 +${b.mag}` : ""}
              {b.def ? ` 防御 +${b.def}` : ""}
              {b.hp ? ` 生命 +${b.hp}` : ""}
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
            {s.itemId ? (
              <T1Art kind="equipment" id={s.itemId} fallback="◈" alt="" />
            ) : EMPTY_SLOT_EQUIPMENT_ID[s.id] ? (
              <T1Art kind="equipment" id={EMPTY_SLOT_EQUIPMENT_ID[s.id]} className="slot-empty-art" fallback="◈" alt="" />
            ) : null}
            <strong>{s.itemName || "空"}</strong>
            {(s.effect || s.hint) && <small className="slot-effect">{s.itemId ? s.effect : s.hint}</small>}
            {s.itemId && s.durabilityPct !== undefined && (
              <span className={`slot-durability${s.broken ? " broken" : ""}`} aria-label={`耐久 ${s.durabilityPct}%`}>
                <span className="slot-durability-fill" style={{ width: `${s.durabilityPct}%` }} />
                {s.broken ? <em>破损</em> : null}
              </span>
            )}
          </button>
        ))}
      </div>
      {damagedSlots.length > 0 && (
        <div className="sheet-repair">
          {damagedSlots.length > 1 && props.onRepairAll && (
            <button
              type="button"
              className="repair-chip repair-all-chip"
              disabled={!!props.repairingItemId}
              onClick={() => props.onRepairAll?.()}
              aria-label="一键修理全部受损装备"
            >
              <T1Art kind="ui" id="nav-smithing" className="gold-inline" alt="" /> 一键全修 ({damagedSlots.length} 件 · {totalRepairCost} 金)
            </button>
          )}
          {damagedSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              className="repair-chip"
              disabled={!props.onRepairItem || props.repairingItemId === s.itemId}
              onClick={() => props.onRepairItem?.(s.itemId!)}
              aria-label={`修理 ${s.itemName}`}
            >
              <T1Art kind="ui" id="nav-smithing" className="gold-inline" alt="" /> {s.broken ? "修理 " : ""}{s.itemName} · {Math.round(s.durabilityPct!)}% → {s.repairCost ?? 0} 金
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
