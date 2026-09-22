import { T1Art } from "./T1Art";
import type { PreviewAbility } from "../gameplay/fightPreview";
import type { AbilityTrigger } from "../types/game";

const ABILITY_EMOJI: Record<string, string> = {
  heavy_chop: "🪓",
  smash: "💥",
  minor_heal: "💚",
  brace: "🛡️",
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
  onCast: (abilityId: string) => void;
};

/**
 * MWI-style ability row during a fight. Equipped abilities auto-cast by trigger on the server; the
 * buttons show cooldown / mana state and let the player fire one by hand (the server still decides).
 */
export function AbilityBar(props: Props) {
  if (props.abilities.length === 0) {
    return <div className="ability-bar empty">没有装备技能 · 在冒险页的战斗配置里放入技能</div>;
  }
  return (
    <div className="ability-bar" role="group" aria-label="技能">
      {props.abilities.map((a) => {
        const ready = props.readyAt(a.def.id);
        const cdLeft = Math.max(0, ready - props.now);
        const noMana = a.def.mpCost > props.mp;
        const urgent = a.def.breaksGuard && props.guardActive && cdLeft === 0;
        const isReady = cdLeft === 0 && !noMana;
        const state = cdLeft > 0 ? `冷却 ${Math.ceil(cdLeft / 1000)}s` : noMana ? `魔力不足（需 ${a.def.mpCost}）` : urgent ? "破防！" : "就绪";
        const label = `${a.def.name}${a.level > 1 ? ` Lv.${a.level}` : ""}`;
        return (
          <button
            key={a.def.id}
            type="button"
            className={`btn-action skill-action ability-btn${isReady ? " skill-ready" : ""}${urgent ? " skill-urgent" : ""}`}
            disabled={props.disabled || !isReady}
            title={`${a.def.blurb}\n触发：${describeTrigger(a.trigger)}`}
            onClick={() => props.onCast(a.def.id)}
          >
            <T1Art kind="skills" id={a.def.id} fallback={abilityEmoji(a.def.id)} alt="" />
            <span className="ability-copy">
              <strong>{label}</strong>
              <small>{state}{a.def.mpCost > 0 ? ` · ${a.def.mpCost} 魔力` : ""}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
