import type { Storage } from "./storage";
import type { EnhancedContentPack, Party } from "./types";
import { defaultCombatSkills } from "./combat_skills";

export interface PartyBotProfile {
  deviceId: string;
  name: string;
  title: string;
  classId: string;
  gender: "male" | "female";
  combatLevel: number;
}

export const PARTY_BOT_PROFILES: PartyBotProfile[] = [
  { deviceId: "party_bot_slime", name: "一刀一个史莱姆", title: "森林先锋", classId: "woodcutter", gender: "male", combatLevel: 8 },
  { deviceId: "party_bot_wood", name: "村口砍树王", title: "资深樵夫", classId: "woodcutter", gender: "male", combatLevel: 6 },
  { deviceId: "party_bot_smith", name: "打铁的王师傅", title: "首席铁匠", classId: "blacksmith", gender: "male", combatLevel: 15 },
  { deviceId: "party_bot_fish", name: "摸鱼大宗师", title: "垂钓隐士", classId: "farmer", gender: "male", combatLevel: 12 },
  { deviceId: "party_bot_alch", name: "熬夜炼金师", title: "秘药学者", classId: "alchemist", gender: "female", combatLevel: 18 },
  { deviceId: "party_bot_chef", name: "暴躁小厨娘", title: "战地主厨", classId: "chef", gender: "female", combatLevel: 14 },
  { deviceId: "party_bot_lucky", name: "欧皇本皇", title: "掉宝锦鲤", classId: "tailor", gender: "female", combatLevel: 22 },
  { deviceId: "party_bot_hope", name: "全村的希望", title: "重甲护卫", classId: "blacksmith", gender: "female", combatLevel: 26 },
  { deviceId: "party_bot_grind", name: "再刷亿把就睡", title: "肝帝狂战", classId: "woodcutter", gender: "male", combatLevel: 30 },
  { deviceId: "party_bot_purple", name: "不掉紫装不改名", title: "秘境猎手", classId: "alchemist", gender: "female", combatLevel: 35 },
];

export interface PresetBotPartyDef {
  key: string;
  name: string;
  recommendedStageId: string;
  botDeviceIds: string[];
}

export const PRESET_BOT_PARTIES: PresetBotPartyDef[] = [
  {
    key: "preset_party_forest",
    name: "【呼呼大睡森林】树精首领讨伐队",
    recommendedStageId: "forest",
    botDeviceIds: ["party_bot_slime", "party_bot_wood"],
  },
  {
    key: "preset_party_mine",
    name: "【叮当响矿山】矿山首领讨伐队",
    recommendedStageId: "mine",
    botDeviceIds: ["party_bot_smith", "party_bot_fish"],
  },
  {
    key: "preset_party_swamp",
    name: "【雾蒙蒙沼泽】沼泽首领攻坚团",
    recommendedStageId: "swamp",
    botDeviceIds: ["party_bot_alch", "party_bot_chef", "party_bot_lucky"],
  },
  {
    key: "preset_party_snow",
    name: "【冰封雪山】雪原首领远征队",
    recommendedStageId: "snow",
    botDeviceIds: ["party_bot_hope", "party_bot_grind"],
  },
];

const LEGACY_STAGE_ID_MAP: Record<string, string> = {
  stage_1: "forest",
  stage_forest: "forest",
  stage_2: "mine",
  stage_mine: "mine",
  stage_3: "swamp",
  stage_swamp: "swamp",
  stage_4: "snow",
  stage_snow: "snow",
  stage_volcano: "volcano",
  stage_abyss: "abyss",
  stage_celestial: "celestial",
  stage_rift: "rift",
  stage_inferno: "inferno",
  stage_genesis: "genesis",
  stage_omega: "omega",
};

export function normalizePartyStageId(stageId?: string | null): string {
  if (!stageId) return "forest";
  const trimmed = stageId.trim();
  return LEGACY_STAGE_ID_MAP[trimmed] || trimmed;
}

export const FALLBACK_ADVENTURER_NAMES: string[] = [
  "路过的砍树人",
  "爱喝红药的剑客",
  "星光采药人",
  "森林巡逻员",
  "矿洞探路者",
  "吃饱才挥剑",
  "盾牌擦亮工",
  "满背包松木",
  "暴击爱好者",
  "史莱姆克星",
  "篝火烤鱼人",
  "资深打铁匠",
  "草药收集控",
  "雪原寻宝客",
  "熔岩钓鱼佬",
  "秘境散人",
  "早起种田人",
  "迷路的小裁缝",
  "铁砧敲碎者",
  "药水摇匀师",
  "平底锅战神",
  "不知名高手",
  "快乐屯屯鼠",
  "野生大剑豪",
  "拂晓游侠",
  "月光炼金徒",
  "铜矿挖掘机",
  "丝绸织梦人",
  "深海钓鲨客",
  "烈焰守望者",
  "霜雪行者",
  "寻宝小能手",
];

export const FALLBACK_PARTY_NAMES: string[] = [
  "【迷雾森林】林间巡猎小队",
  "【矿洞探险】深层掘金小队",
  "【悬赏互助】摸鱼冒险团",
  "【秘境开荒】篝火远征队",
  "【日常速刷】材料互助小队",
  "【首领讨伐】赏金猎人团",
  "【凛冬远征】破冰先锋队",
  "【深渊探索】星辉守望团",
];

/** Map of bot userId -> PartyBotProfile (populated when bots are ensured). */
const botUserById = new Map<string, PartyBotProfile>();
/** Map of `${partyId}:${userId}` -> ready boolean for human members (default true once readied). */
const memberReadyMap = new Map<string, boolean>();
/** WeakMap of Storage -> in-flight/completed seeding promise. */
const seededStorages = new WeakMap<object, Promise<void>>();

function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Returns true if a display name is missing, a default `玩家_xxxxxx` fallback,
 * or looks like a raw UUID / hex / E2E test identifier.
 */
export function isGarbledOrDefaultName(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^玩家_[0-9a-f-]{4,}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{6,36}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(trimmed)) return true;
  if (/^(test|e2e|guest|user|bot|player)[-_0-9a-f]+$/i.test(trimmed)) return true;
  return false;
}

/**
 * Returns true if a party name is missing or looks like a raw ID / E2E test stub (`队伍 a1b2c3d4`, `p1`, `test`, etc.).
 */
export function isGarbledPartyName(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^队伍\s*[0-9a-f-]{4,}$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{6,36}$/i.test(trimmed)) return true;
  if (/^(p\d+|test[-_\w]*|e2e[-_\w]*|party[-_\w]*)$/i.test(trimmed)) return true;
  return false;
}

export function isPartyBotUserId(userId: string): boolean {
  return botUserById.has(userId) || userId.startsWith("party_bot_");
}

export function getBotProfileByUserId(userId: string): PartyBotProfile | undefined {
  return botUserById.get(userId);
}

/**
 * Guarantees a fun, readable Chinese adventurer nickname for any userId (bot or unnamed guest).
 */
export function friendlyAdventurerName(userId: string, rawDisplayName?: string | null): string {
  const bot = botUserById.get(userId);
  if (bot) return bot.name;
  if (rawDisplayName && !isGarbledOrDefaultName(rawDisplayName)) {
    return rawDisplayName.trim();
  }
  const idx = hashString(userId) % FALLBACK_ADVENTURER_NAMES.length;
  return FALLBACK_ADVENTURER_NAMES[idx];
}

/**
 * Guarantees a readable Chinese party name instead of `队伍 a1b2c3d4` or raw UUIDs.
 */
export function friendlyPartyName(partyId: string, rawName?: string | null, leaderDisplayName?: string | null): string {
  if (rawName && !isGarbledPartyName(rawName)) {
    return rawName.trim();
  }
  if (leaderDisplayName && !isGarbledOrDefaultName(leaderDisplayName)) {
    return `${leaderDisplayName}的冒险小队`;
  }
  const idx = hashString(partyId) % FALLBACK_PARTY_NAMES.length;
  return FALLBACK_PARTY_NAMES[idx];
}

export function getMemberReady(partyId: string, userId: string, isBotOrOffline: boolean): boolean {
  if (isBotOrOffline || isPartyBotUserId(userId)) return true;
  const key = `${partyId}:${userId}`;
  // Human players default to ready=false when they first join so they can click "准备",
  // or true once they click "准备".
  return memberReadyMap.get(key) ?? false;
}

export function setMemberReady(partyId: string, userId: string, ready: boolean): boolean {
  if (isPartyBotUserId(userId)) return true;
  const key = `${partyId}:${userId}`;
  memberReadyMap.set(key, ready);
  return ready;
}

/**
 * Ensures the 4 preset NPC/Bot adventurer parties exist so players always have lively,
 * Chinese-named bot teammates who are auto-ready and ready to start combat immediately.
 */
export async function ensurePresetParties(
  storage: Storage,
  contentPack: EnhancedContentPack
): Promise<void> {
  const existingPromise = seededStorages.get(storage);
  if (existingPromise) {
    await existingPromise.catch(() => undefined);
    return;
  }

  const run = (async () => {
    const version = contentPack.version || "1.0.0";
    // 1. Ensure all bot user records & player states exist with Chinese names
    const deviceToUserId = new Map<string, string>();
    for (const profile of PARTY_BOT_PROFILES) {
      const user = await storage.findOrCreateGuestUser(profile.deviceId);
      deviceToUserId.set(profile.deviceId, user.id);
      botUserById.set(user.id, profile);

      const st = await storage.getOrCreatePlayerState(user.id, version);
      const curName = st.settings?.playerName;
      if (curName !== profile.name || st.combatLevel !== profile.combatLevel) {
        await storage.executePlayerCommand({
          userId: user.id,
          now: new Date(),
          contentPack,
          apply: (state) => {
            state.activeClassId = profile.classId;
            state.combatLevel = profile.combatLevel;
            state.combatSkills = defaultCombatSkills(profile.combatLevel);
            state.settings = {
              soundEnabled: true,
              animationsEnabled: true,
              compactMode: false,
              notificationsEnabled: true,
              ...(state.settings || {}),
              playerName: profile.name,
              gender: profile.gender,
              characterCreated: true,
              tutorialDone: true,
            };
            return { ok: true };
          },
        }).catch(() => undefined);
      }
    }

    // 2. Check existing public parties and seed any missing preset bot party
    const list = await storage.listParties({ limit: 100 });
    const existingNames = new Set(list.map((p) => p.name));

    for (const preset of PRESET_BOT_PARTIES) {
      if (existingNames.has(preset.name)) continue;

      const botUserIds = preset.botDeviceIds
        .map((d) => deviceToUserId.get(d))
        .filter((id): id is string => Boolean(id));
      if (botUserIds.length === 0) continue;

      // Check if lead bot is already in a party
      const leadId = botUserIds[0];
      const existingParty = await storage.getPartyForUser({ userId: leadId }).catch(() => null);
      if (existingParty) continue;

      try {
        const created = await storage.createParty({ userId: leadId, name: preset.name });
        for (let i = 1; i < botUserIds.length; i++) {
          const memberBotId = botUserIds[i];
          const mParty = await storage.getPartyForUser({ userId: memberBotId }).catch(() => null);
          if (!mParty) {
            await storage.joinParty({ userId: memberBotId, partyId: created.id }).catch(() => undefined);
          }
        }
      } catch {
        // Ignore if already in party
      }
    }
  })();

  seededStorages.set(storage, run);
  await run;
}

/**
 * If a human player is in a party where the current leader is a bot or an offline player,
 * automatically promote the human player to leader so they can start combat immediately.
 */
export async function ensureHumanLeaderIfBotParty(
  storage: Storage,
  userId: string,
  party: Party | null
): Promise<Party | null> {
  if (!party) return null;
  if (party.leaderId === userId) return party;
  if (isPartyBotUserId(userId)) return party;

  const isMember = party.members.some((m) => m.userId === userId);
  if (!isMember) return party;

  const leaderMember = party.members.find((m) => m.userId === party.leaderId);
  const leaderIsBotOrOffline =
    isPartyBotUserId(party.leaderId) ||
    !leaderMember ||
    !leaderMember.isOnline;

  if (leaderIsBotOrOffline) {
    const res = await storage
      .transferPartyLeadership({
        userId: party.leaderId,
        partyId: party.id,
        memberId: userId,
      })
      .catch(() => ({ success: false }));
    if (res.success) {
      const updated = await storage.getPartyForUser({ userId });
      if (updated) return updated;
    }
  }
  return party;
}

/**
 * Recruits an available NPC/Bot adventurer with a fun Chinese nickname into the player's party.
 */
export async function recruitBotToParty(
  storage: Storage,
  contentPack: EnhancedContentPack,
  partyId: string
): Promise<{ success: boolean; botName?: string; message?: string }> {
  await ensurePresetParties(storage, contentPack);
  const version = contentPack.version || "1.0.0";

  for (const profile of PARTY_BOT_PROFILES) {
    const botUser = await storage.findOrCreateGuestUser(profile.deviceId);
    botUserById.set(botUser.id, profile);
    await storage.getOrCreatePlayerState(botUser.id, version);

    const existingParty = await storage.getPartyForUser({ userId: botUser.id }).catch(() => null);
    if (existingParty?.id === partyId) continue;
    if (existingParty) continue;

    try {
      await storage.joinParty({ userId: botUser.id, partyId });
      return { success: true, botName: profile.name };
    } catch {
      continue;
    }
  }

  // Fallback: create a fresh extra bot adventurer if all 10 preset bots are in other parties
  for (let i = 1; i <= 20; i++) {
    const deviceId = `party_bot_extra_${i}`;
    const name = FALLBACK_ADVENTURER_NAMES[i % FALLBACK_ADVENTURER_NAMES.length];
    const profile: PartyBotProfile = {
      deviceId,
      name,
      title: "协战游侠",
      classId: "woodcutter",
      gender: i % 2 === 0 ? "female" : "male",
      combatLevel: 10 + i * 2,
    };
    const botUser = await storage.findOrCreateGuestUser(deviceId);
    botUserById.set(botUser.id, profile);
    const st = await storage.getOrCreatePlayerState(botUser.id, version);
    if (st.settings?.playerName !== name) {
      await storage.executePlayerCommand({
        userId: botUser.id,
        now: new Date(),
        contentPack,
        apply: (state) => {
          state.settings = {
            soundEnabled: true,
            animationsEnabled: true,
            compactMode: false,
            notificationsEnabled: true,
            ...(state.settings || {}),
            playerName: name,
            characterCreated: true,
            tutorialDone: true,
          };
          return { ok: true };
        },
      }).catch(() => undefined);
    }
    const existingParty = await storage.getPartyForUser({ userId: botUser.id }).catch(() => null);
    if (existingParty) continue;
    try {
      await storage.joinParty({ userId: botUser.id, partyId });
      return { success: true, botName: name };
    } catch (e: any) {
      if (String(e?.message).includes("party_full")) {
        return { success: false, message: "队伍已满员（最多 6 人）" };
      }
      continue;
    }
  }

  return { success: false, message: "暂无空闲机器人可招募" };
}

/**
 * Simulates combat / raid / crafting contributions for bot teammates in the party
 * so teaming up with bots produces real shared rewards and raid progress!
 */
export async function simulateBotPartyContributions(
  storage: Storage,
  party: Party,
  contentPack: EnhancedContentPack
): Promise<void> {
  const activity = party.currentActivity;
  if (!activity) return;

  const elapsedMs = Math.max(0, Date.now() - Date.parse(activity.startedAt));
  // At least 1 tick of contribution even if settled quickly
  const elapsedMinutes = Math.max(1, Math.floor(elapsedMs / 30_000));

  for (const m of party.members) {
    const isBot = isPartyBotUserId(m.userId);
    if (!isBot) continue;

    const base = activity.baseline?.[m.userId];
    if (!base) continue;

    const targetKills = elapsedMinutes * 4;
    const targetBossKills = activity.raidBossId ? Math.max(1, Math.floor(elapsedMinutes / 2)) : 0;
    const targetActions = elapsedMinutes * 5;

    await storage
      .executePlayerCommand({
        userId: m.userId,
        now: new Date(),
        contentPack,
        apply: (state) => {
          if (!state.stats) return { ok: false };
          const s = state.stats as any;
          if (activity.type === "group_craft") {
            s.totalActions = Math.max(s.totalActions || 0, base.actions + targetActions);
          } else {
            s.totalKills = Math.max(s.totalKills || 0, base.kills + targetKills);
            if (activity.raidBossId) {
              s.killsByMonster = s.killsByMonster || {};
              s.killsByMonster[activity.raidBossId] = Math.max(
                s.killsByMonster[activity.raidBossId] || 0,
                base.raidBossKills + targetBossKills
              );
              s.totalBossKills = Math.max(s.totalBossKills || 0, base.bossKills + targetBossKills);
            }
          }
          return { ok: true };
        },
      })
      .catch(() => undefined);
  }
}

/**
 * Enriches a Party payload with friendly Chinese names, bot flags, and ready states.
 */
export function enrichPartyForClient(party: Party | null, currentUserId?: string) {
  if (!party) return null;
  const members = party.members.map((m, idx) => {
    const botProfile = getBotProfileByUserId(m.userId);
    const isSelf = m.userId === currentUserId;
    const isBot = Boolean(botProfile) || (!isSelf && !m.isOnline && isGarbledOrDefaultName(m.displayName));
    const displayName = friendlyAdventurerName(m.userId, m.displayName);
    const isReady = getMemberReady(party.id, m.userId, isBot);
    const fallbackClasses = ["woodcutter", "blacksmith", "farmer", "alchemist", "chef", "tailor"];
    return {
      ...m,
      displayName,
      title: botProfile?.title || (isBot ? "协战冒险者" : undefined),
      classId: botProfile?.classId || (m as any).classId || fallbackClasses[idx % fallbackClasses.length],
      gender: botProfile?.gender || (m as any).gender || (idx % 2 === 0 ? "male" : "female"),
      combatLevel: botProfile?.combatLevel || Math.max(1, Number((m as any).combatLevel || 8)),
      isBot,
      isOnline: isBot ? true : Boolean(m.isOnline),
      isReady,
    };
  });

  const leaderMember = members.find((m) => m.userId === party.leaderId);
  const name = friendlyPartyName(party.id, (party as any).name, leaderMember?.displayName);
  const allReady = members.every((m) => m.isReady);
  const normalizedActivity = party.currentActivity
    ? {
        ...party.currentActivity,
        stageId: party.currentActivity.stageId ? normalizePartyStageId(party.currentActivity.stageId) : "forest",
      }
    : party.currentActivity;

  return {
    ...party,
    name,
    members,
    allReady,
    currentActivity: normalizedActivity,
  };
}
