import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/api";
import { GoldIcon, T1Art, T1ItemIcon } from "./T1Art";
import { useToast } from "./Toast";

/** Each room is a skill's workshop, so it wears that skill's rail icon. */
const ROOM_ICON: Record<string, string> = {
  lumber_yard: "nav-logging",
  forge: "nav-smithing",
  barn: "nav-husbandry",
  kitchen: "nav-cooking",
  sewing_room: "nav-tailoring",
  laboratory: "nav-alchemy",
  training_ground: "nav-adventure",
};

type RoomView = {
  id: string;
  name: string;
  skillId: string;
  blurb: string;
  emoji: string;
  level: number;
  bonus: { xpPct?: number; efficiencyPct?: number; combatXpPct?: number; rareFindPct?: number };
  nextCost?: {
    gold: number;
    materials: Array<{ itemId: string; qty: number; name: string; have: number }>;
    affordable: boolean;
  };
};

type HouseView = { totalLevel: number; maxLevel: number; rooms: RoomView[] };

type Props = {
  iconOf: (itemId: string) => string;
  gold: number;
  /** Re-fetch key: inventory changes move the affordable flags. */
  refreshKey: string;
  onChanged: () => void;
};

function bonusLine(r: RoomView): string {
  if (r.skillId === "skill_combat") return `战斗经验 +${r.bonus.combatXpPct || 0}% · 稀有发现 +${r.bonus.rareFindPct || 0}%`;
  return `经验 +${r.bonus.xpPct || 0}% · 效率 +${r.bonus.efficiencyPct || 0}%`;
}

/**
 * MWI 房屋: one room per skill, eight levels, paid in gold and the skill's own materials.
 * Each level is a permanent +1% XP / +1% efficiency for that skill (训练场: combat XP + rare find).
 */
export function HousesPage(props: Props) {
  const toast = useToast();
  const [view, setView] = useState<HouseView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      apiClient.clearCache();
      setView(await apiClient.getHouses());
    } catch (e: any) {
      toast.error(e?.message || "读取房屋失败");
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load, props.refreshKey]);

  const upgrade = async (room: RoomView) => {
    setBusy(room.id);
    try {
      apiClient.clearCache();
      const res: any = await apiClient.upgradeRoom(room.id);
      if (res.house) setView(res.house);
      toast.success(`${room.name}升到 ${res.level} 级`);
      props.onChanged();
    } catch (e: any) {
      toast.error(e?.message || "升级失败");
    } finally {
      setBusy(null);
    }
  };

  if (!view) {
    return (
      <div className="houses-page skill-page" data-skill-page="houses">
        <div className="page-header"><h2 className="section-title">房屋</h2></div>
        <div className="loading-message">加载中...</div>
      </div>
    );
  }

  return (
    <div className="houses-page skill-page" data-skill-page="houses">
      <div className="page-header">
        <h2 className="section-title">房屋 <span className="skill-page-level">总等级 {view.totalLevel}/{view.rooms.length * view.maxLevel}</span></h2>
        <div className="page-info"><p>每个技能一间房。用金币和这个技能自己的材料升级，换该技能的永久加成。</p></div>
      </div>
      <div className="houses-grid">
        {view.rooms.map((r) => (
          <div className={`house-room${r.level >= view.maxLevel ? " maxed" : ""}`} key={r.id} data-room-id={r.id}>
            <div className="house-room-head">
              <span className="house-room-emoji" aria-hidden="true">
                {ROOM_ICON[r.id] ? <T1Art kind="ui" id={ROOM_ICON[r.id]} fallback={r.emoji} alt="" /> : r.emoji}
              </span>
              <div className="task-copy">
                <strong>{r.name} <span className="house-room-level">Lv.{r.level}/{view.maxLevel}</span></strong>
                <small>{r.blurb}</small>
              </div>
            </div>
            <div className="house-room-bonus">{r.level > 0 ? bonusLine(r) : "尚未建造 · 每级 +1% 经验与 +1% 效率"}</div>
            <div className="house-room-levels" aria-hidden="true">
              {Array.from({ length: view.maxLevel }).map((_, i) => (
                <span key={i} className={`house-pip${i < r.level ? " on" : ""}`} />
              ))}
            </div>
            {r.nextCost ? (
              <div className="house-room-cost">
                <div className="house-cost-lines">
                  <span className={props.gold >= r.nextCost.gold ? "ok" : "short"}><GoldIcon /> {r.nextCost.gold}</span>
                  {r.nextCost.materials.map((m) => (
                    <span key={m.itemId} className={m.have >= m.qty ? "ok" : "short"}>
                      <T1ItemIcon itemId={m.itemId} fallback={props.iconOf(m.itemId)} alt="" /> {m.name} {m.have}/{m.qty}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className={`btn-action${r.nextCost.affordable ? " craftable" : ""} house-upgrade`}
                  disabled={!r.nextCost.affordable || busy === r.id}
                  onClick={() => upgrade(r)}
                >
                  {r.nextCost.affordable ? `升到 Lv.${r.level + 1}` : "材料不足"}
                </button>
              </div>
            ) : (
              <div className="house-room-cost"><span className="ok">已满级</span></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
