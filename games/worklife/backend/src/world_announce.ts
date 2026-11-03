// 世界频道自然事件广播:对玩家状态做前后差分,产出值得全服播报的系统消息。
// 原则:只报"首次/里程碑"类一次性事件(新村民、Boss 首杀、转生、强化大关),
// 日常动作不报,避免刷屏。

import type { EnhancedContentPack, EnhancedPlayerState } from "./types";

const ENHANCE_MILESTONES = [5, 10, 15, 20];

function displayName(state: EnhancedPlayerState, userId: string): string {
  return state.settings?.playerName || `玩家_${userId.slice(0, 6)}`;
}

export function worldAnnouncements(
  before: EnhancedPlayerState,
  after: EnhancedPlayerState,
  contentPack: EnhancedContentPack,
  userId: string,
): string[] {
  const name = displayName(after, userId);
  const out: string[] = [];

  // 新村民完成建号
  if (!before.settings?.characterCreated && after.settings?.characterCreated) {
    out.push(`🌱 欢迎新村民「${name}」来到异世界打工！`);
  }

  // Boss 首杀(每个 Boss 仅第一次)
  const beforeKills = before.stats?.killsByMonster ?? {};
  const afterKills = after.stats?.killsByMonster ?? {};
  for (const m of contentPack.monsters ?? []) {
    const id = String(m.id ?? "");
    const isBoss = Boolean(m.isBoss) || id.endsWith("_boss");
    if (!isBoss) continue;
    if ((beforeKills[id] ?? 0) === 0 && (afterKills[id] ?? 0) > 0) {
      const bossName = String(m.name ?? id).replace(/\(BOSS\)$/i, "");
      out.push(`⚔️ 「${name}」首次击败了「${bossName}」！`);
    }
  }

  // 转生
  const pc = (after.prestige?.count ?? 0) - (before.prestige?.count ?? 0);
  if (pc > 0) {
    out.push(`✨ 「${name}」完成了第 ${after.prestige!.count} 次转生！`);
  }

  // 强化跨里程碑(+5/+10/+15/+20)
  const beforeEnh = before.equipment?.enhancementLevels ?? {};
  const afterEnh = after.equipment?.enhancementLevels ?? {};
  const itemNames = new Map((contentPack.items ?? []).map((i) => [i.id, i.name]));
  for (const [itemId, lv] of Object.entries(afterEnh)) {
    const prev = beforeEnh[itemId] ?? 0;
    const crossed = ENHANCE_MILESTONES.filter((ms) => prev < ms && lv >= ms).pop();
    if (crossed !== undefined) {
      out.push(`🔨 「${name}」将「${itemNames.get(itemId) ?? itemId}」强化到了 +${crossed}！`);
    }
  }

  return out;
}
