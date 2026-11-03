import { T1Art } from "./T1Art";
import {
  abilityCastXp,
  abilityEffectiveCooldownMs,
  abilityMasteryTier,
  getAbilityXpForLevel,
  type PreviewAbility,
} from "../gameplay/fightPreview";
import type { AbilityTrigger } from "../types/game";

const ABILITY_EMOJI: Record<string, string> = {
  heavy_chop: "🪓",
  smash: "💥",
  minor_heal: "💚",
  brace: "🛡️",
  cleave: "⚔️",
  taunt: "🎯",
  arrow_rain: "🏹",
  group_heal: "💖",
  meteor_storm: "☄️",
  war_aura: "🚩",
  quick_shot: "🌪️",
  spore_ward: "🍄",
  shield_bash: "🔨",
  mana_pulse: "💎",
  venom_fang: "🐍",
  soul_drain: "👻",
  frost_nova: "❄️",
  glacial_snipe: "🧊",
  flame_burst: "🌋",
  phoenix_blessing: "🔥",
  void_rift: "🌀",
  abyssal_pact: "🔮",
  holy_judgment: "⚡",
  seraph_aegis: "🪽",
  chrono_overload: "⏳",
  hellfire_cataclysm: "☄️",
  genesis_sanctuary: "🌟",
  omega_annihilation: "🌌",
};

export function abilityEmoji(id: string): string {
  return ABILITY_EMOJI[id] || "✨";
}

export function describeTrigger(t: AbilityTrigger): string {
  switch (t.type) {
    case "always":
      return "冷却好了就放";
    case "enemy_hp_below":
      return `敌人生命 ≤ ${t.pct}%`;
    case "self_hp_below":
      return `自己生命 ≤ ${t.pct}%`;
    case "ally_hp_below":
      return `队友生命 ≤ ${t.pct}%`;
    case "enemies_at_least":
      return `敌方数量 ≥ ${t.pct} 只`;
    case "enemy_guard":
      return "敌人格挡时";
  }
}

type Props = {
  abilities: PreviewAbility[];
  readyAt: (abilityId: string) => number;
  now: number;
  mp: number;
  maxMp: number;
  guardActive: boolean;
  disabled?: boolean;
  onCast?: (abilityId: string) => void;
};

/**
 * MWI-style passive/auto-cast ability icon row during a fight.
 * All active abilities fire automatically when off cooldown & trigger is met; each slot is a pure
 * status icon showing its live cooldown (CD) overlay and countdown.
 */
export function AbilityBar(props: Props) {
  if (props.abilities.length === 0) {
    return null;
  }
  return (
    <div className="ability-bar ability-icon-bar" role="group" aria-label="自动技能状态">
      {props.abilities.map((a) => {
        const ready = props.readyAt(a.def.id);
        const cdLeft = Math.max(0, ready - props.now);
        const cdTotal = Math.max(1, abilityEffectiveCooldownMs(a.def, a.level));
        const cdPct = cdLeft > 0 ? Math.min(100, Math.max(0, ((cdTotal - Math.min(cdTotal, cdLeft)) / cdTotal) * 100)) : 100;
        const remainPct = Math.max(0, Math.min(100, 100 - cdPct));
        const noMana = a.def.mpCost > props.mp;
        const urgent = !props.disabled && Boolean(a.def.breaksGuard && props.guardActive && cdLeft === 0);
        const isReady = !props.disabled && cdLeft === 0 && !noMana;
        const xp = Math.round((a.xp ?? 0) * 10) / 10;
        const nextXp = a.nextXp ?? getAbilityXpForLevel(a.level);
        const xpPct = Number.isFinite(nextXp) && nextXp > 0 ? Math.min(100, Math.max(0, Math.round((xp / nextXp) * 100))) : 100;
        const mastery = abilityMasteryTier(a.level);
        const castXp = a.castXp ?? abilityCastXp(a.def, 1);
        const bonusPct = Math.round(Math.max(0, a.level - 1) * (a.def.levelStep ?? 0.05) * 100);
        const stateText = props.disabled
          ? "待命中"
          : cdLeft > 0
            ? `冷却中 ${(cdLeft / 1000).toFixed(1)}s`
            : noMana
              ? `魔力不足（需 ${a.def.mpCost}）`
              : urgent
                ? "自动破防就绪"
                : "自动释放就绪";
        const label = `${a.def.name} Lv.${a.level}`;
        return (
          <div
            key={a.def.id}
            className={`ability-icon-slot${isReady ? " is-ready" : ""}${cdLeft > 0 ? " on-cd" : ""}${noMana ? " no-mana" : ""}${urgent ? " is-urgent" : ""}`}
            title={`${label} 【${mastery.title}】（自动释放）\n熟练度经验：${xp} / ${nextXp} (${xpPct}%) · 每次释放 +${castXp}+ EXP\n当前加成：技能威力 +${bonusPct}%${mastery.cdReductionPct > 0 ? ` · 冷却缩减 -${mastery.cdReductionPct}%` : ""}\n${a.def.blurb}\n触发条件：${describeTrigger(a.trigger)} · 冷却 ${(cdTotal / 1000).toFixed(1)}s${a.def.mpCost > 0 ? ` · 魔力 ${a.def.mpCost}` : ""}\n状态：${stateText}`}
            aria-label={`${label} ${stateText}`}
          >
            <div className="ability-icon-art">
              <T1Art kind="skills" id={a.def.id} fallback={abilityEmoji(a.def.id)} alt={a.def.name} />
            </div>
            {cdLeft > 0 && (
              <>
                <div className="ability-icon-cd-sweep" style={{ height: `${remainPct}%` }} aria-hidden="true" />
                <span className="ability-icon-cd-text">{(cdLeft / 1000).toFixed(1)}s</span>
              </>
            )}
            {cdLeft === 0 && noMana && (
              <span className="ability-icon-cd-text is-oom">缺蓝</span>
            )}
            <span className="ability-icon-lvl">Lv.{a.level}</span>
            <div className="ability-icon-xp-bar" aria-hidden="true">
              <div className="ability-icon-xp-fill" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
