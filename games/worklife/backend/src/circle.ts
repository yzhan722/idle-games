/**
 * 同好会（WL-G4 真人公会）：真人玩家自己组的长期团体。只有协作与展示：团内聊天、成员列表、本周击杀 / 生产，
 * **不给任何数值加成**，也不是转生保留的加成。内存与 PostgreSQL 两个存储都用这里的规则，规则只写一份。
 *
 * 为什么叫「同好会」：游戏里「商会」已是系统（商会补给站、商会经营系、万邦星途总商会），「伙伴」是魔兽出战伙伴，
 * 「行会 / 公会」是系统对手（行会战、公会领地 / 公会城镇、冒险者行会），「团员」是行会战的徽章名；参考游戏叫 Guild。
 * 「同好会」在代码与文案里都没出现过，也贴「打工生活」的日常口吻。
 *
 * - 名字：2～12 个字，过 name_filter 屏蔽词与保留名（display_name.ts）。查重口径与屏蔽词一致（name_filter 的 foldForCompare）：
 *   全角半角、大小写、空格、标点不同都算重名（「猫·会」与「猫会」）。name_key 只在新建时按这个口径算；没有改名功能。
 *   旧数据（改口径前建的会）的 name_key 原样保留，启动建表 / 迁移不重算：新会只和库里存着的 name_key 比，
 *   所以与旧会只差标点的新名字仍可能建成功；旧会名里带标点的，整名搜不到，搜标点两边的片段能搜到。
 * - 建会花 CIRCLE_CREATE_COST 金币（从存档扣，记进累计花费）；一个人同时只在一个同好会里。
 * - 人数上限 CIRCLE_MAX_MEMBERS；申请与邀请合计最多 CIRCLE_PENDING_MAX 条（满了先处理）。
 * - 会长：通过 / 拒绝申请、邀请、踢人、转让、解散。会长有成员时不能直接退出（先转让或解散）。
 * - 注销：会长注销自动转给最早加入的成员（同一时刻按编号），没有成员就解散；他的申请、邀请一并删掉。
 * - 本周击杀 / 生产：每人一条「本周起点」（存档累计数）。周界与行会战同一个（东八区周一 0 点，guildWarWeekKey）；
 *   换周时服务器定时把所有成员的起点重记成那一刻服务器上的累计数（rollCircleWeeks，每分钟看一次），
 *   打开同好会时也会补记（停机跨周时）。离线收益在回来结算时才进累计数，算进结算那一周；只做展示。
 * - 申请被拒后 CIRCLE_REAPPLY_COOLDOWN_MS 内不能再申请同一个会（免得反复打扰会长）。
 * - 加入一个会（被通过 / 接受邀请 / 自己建会）时，他发给其他会的申请、收到的其他会邀请一并清掉（withdrawPending）；拒绝记录留着。
 * - 隐私：外人查不到「某人在哪个会」。会长邀请一个已在别的会里的人，回执和成功一样、邀请静默作废、不提醒对方
 *   （与对方屏蔽了会长时一致）；搜索、团榜只给会名和人数 / 分数，不带成员。
 * - 存档里不放同好会的任何东西：导出存档不含其他成员的编号和名字。
 */
import { isPlainDisplayName, isReservedName } from "./display_name";
import { foldForCompare, isBlockedName, maskBlockedName } from "./name_filter";
import type { PlayerStats } from "./types";

export const CIRCLE_LABEL = "同好会";
export const CIRCLE_MAX_MEMBERS = 30;
export const CIRCLE_NAME_MIN = 2;
export const CIRCLE_NAME_MAX = 12;
export const CIRCLE_CREATE_COST = 1000;
export const CIRCLE_PENDING_MAX = 30;
export const CIRCLE_SEARCH_LIMIT = 20;
/** 写接口每人每分钟最多几次；读接口宽一些。 */
export const CIRCLE_WRITE_LIMIT = { max: 30, timeWindow: "1 minute" };
export const CIRCLE_READ_LIMIT = { max: 60, timeWindow: "1 minute" };

export const CIRCLE_ACTIONS = [
  "apply",
  "cancel_apply",
  "approve",
  "reject",
  "invite",
  "accept",
  "decline",
  "leave",
  "kick",
  "transfer",
  "disband",
] as const;
export type CircleAction = (typeof CIRCLE_ACTIONS)[number];
/** 要指定对方的操作。 */
export const CIRCLE_TARGET_ACTIONS: readonly CircleAction[] = ["approve", "reject", "invite", "kick", "transfer"];

export type CircleError =
  | "name_invalid"
  | "name_taken"
  | "not_enough_gold"
  | "already_in_circle"
  | "not_in_circle"
  | "circle_not_found"
  | "not_leader"
  | "circle_full"
  | "no_request"
  | "pending_full"
  | "self"
  | "not_member"
  | "leader_must_transfer"
  | "user_not_found"
  | "apply_cooldown";

export const CIRCLE_ERROR_TEXT: Record<CircleError, string> = {
  name_invalid: `名字要 ${CIRCLE_NAME_MIN}～${CIRCLE_NAME_MAX} 个字，不能有屏蔽词或冒充官方`,
  name_taken: "这个名字已被使用",
  not_enough_gold: `金币不足（建会要 ${CIRCLE_CREATE_COST}）`,
  already_in_circle: "已经在一个同好会里了",
  not_in_circle: "还没加入同好会",
  circle_not_found: "同好会不存在",
  not_leader: "只有会长能这样做",
  circle_full: `人满了（${CIRCLE_MAX_MEMBERS} 人）`,
  no_request: "没有这条申请或邀请",
  pending_full: "待处理的申请和邀请太多，先处理一些",
  self: "不能对自己这样做",
  not_member: "对方不在同好会里",
  leader_must_transfer: "会长先转让或解散",
  user_not_found: "没有这个玩家",
  apply_cooldown: "刚被拒绝过，明天再申请吧",
};
/** 申请被拒后多久才能再申请同一个会。 */
export const CIRCLE_REAPPLY_COOLDOWN_MS = 24 * 3600_000;

export type CircleMember = {
  userId: string;
  joinedAt: string;
  /** 本周起点：哪一周（weekKey）和那一刻的存档累计数。 */
  week?: string;
  base?: CircleCounters;
};
export type CircleRequest = { userId: string; at: string };
export type CircleDoc = {
  id: string;
  name: string;
  nameKey: string;
  leaderId: string;
  createdAt: string;
  members: CircleMember[];
  applications: CircleRequest[];
  invites: CircleRequest[];
  /** 最近被拒的申请（只为限流，过期就清掉，最多 CIRCLE_PENDING_MAX 条）。 */
  rejected: CircleRequest[];
};
export type CircleCounters = { kills: number; made: number };

export type CircleOutcome =
  | { ok: true; doc: CircleDoc | null; joined: string[]; left: string[]; changed: boolean; leaderChanged?: string }
  | { ok: false; error: CircleError };

/** 给别人看的同好会（搜索结果、邀请）：只有名字和人数。 */
export type CircleSummary = { id: string; name: string; memberCount: number; max: number };
export type CircleMemberView = {
  userId: string;
  name: string;
  isLeader: boolean;
  online: boolean;
  joinedAt: string;
  week: CircleCounters;
};
export type CircleHome = {
  circle: null | {
    id: string;
    name: string;
    memberCount: number;
    max: number;
    isLeader: boolean;
    members: CircleMemberView[];
    /** 只有会长看得到。 */
    applications: Array<{ userId: string; name: string; at: string }>;
    invited: Array<{ userId: string; name: string; at: string }>;
  };
  invites: CircleSummary[];
  applied: CircleSummary[];
  createCost: number;
};

/** 查重与搜索用的写法：与屏蔽词同一个规范化（name_filter 的 foldForCompare），空格标点去掉。 */
export function circleNameKey(name: string): string {
  return foldForCompare(name.trim());
}

/** 新起的同好会名字：长度、看得见、不冒充官方、没有屏蔽词。 */
export function isAcceptableCircleName(raw: string): boolean {
  const name = raw.trim();
  const len = [...name].length;
  if (len < CIRCLE_NAME_MIN || len > CIRCLE_NAME_MAX) return false;
  return isPlainDisplayName(name) && !isReservedName(name) && !isBlockedName(name);
}

export function shownCircleName(name: string): string {
  return maskBlockedName(name);
}

export function newCircleDoc(params: { id: string; name: string; leaderId: string; now: Date; counters?: CircleCounters }): CircleDoc {
  const at = params.now.toISOString();
  const name = params.name.trim();
  return {
    id: params.id,
    name,
    nameKey: circleNameKey(name),
    leaderId: params.leaderId,
    createdAt: at,
    members: [member(params.leaderId, params.now, params.counters)],
    applications: [],
    invites: [],
    rejected: [],
  };
}

/**
 * 周键：东八区周一 0 点换周，值是那个周一的日期（「2026-11-23」）。与行会战 guildWarWeekKey（progression2/abyss_guild.ts）
 * 同一个周界；那个文件引了存档模块，这里照抄公式免得循环引用，测试比对两者一致。
 */
const WEEK_MS = 7 * 86_400_000;
const WEEK_EPOCH_MS = 4 * 86_400_000; // 1970-01-05 周一
const TZ_OFFSET_MS = 480 * 60_000;
export function circleWeekKey(now: Date): string {
  const index = Math.floor((now.getTime() + TZ_OFFSET_MS - WEEK_EPOCH_MS) / WEEK_MS);
  return new Date(WEEK_EPOCH_MS + index * WEEK_MS).toISOString().slice(0, 10);
}

export function circleCounters(stats: Partial<PlayerStats> | null | undefined): CircleCounters {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  return { kills: n(stats?.totalKills), made: n(stats?.totalGathered) + n(stats?.totalCrafted) };
}

function member(userId: string, now: Date, counters?: CircleCounters): CircleMember {
  return { userId, joinedAt: now.toISOString(), ...(counters ? { week: circleWeekKey(now), base: { ...counters } } : {}) };
}

/**
 * 本周数：换周（或没有起点、累计数变小——转生等）就把起点重记成现在。改了 doc 返回 true（调用方要写回）。
 */
export function rollWeek(m: CircleMember, counters: CircleCounters, now: Date): { week: CircleCounters; changed: boolean } {
  const key = circleWeekKey(now);
  const base = m.base;
  if (m.week !== key || !base || counters.kills < base.kills || counters.made < base.made) {
    m.week = key;
    m.base = { ...counters };
    return { week: { kills: 0, made: 0 }, changed: true };
  }
  return { week: { kills: counters.kills - base.kills, made: counters.made - base.made }, changed: false };
}

/** 注销 / 会长离开时的下一任：最早加入的，同一时刻按编号。 */
export function nextLeader(doc: CircleDoc, excluding: string): string | null {
  const rest = doc.members.filter((m) => m.userId !== excluding);
  rest.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.userId.localeCompare(b.userId));
  return rest[0]?.userId ?? null;
}

const clone = (doc: CircleDoc): CircleDoc => JSON.parse(JSON.stringify(doc));
const fail = (error: CircleError): CircleOutcome => ({ ok: false, error });
const same = (doc: CircleDoc): CircleOutcome => ({ ok: true, doc, joined: [], left: [], changed: false });
const isMember = (doc: CircleDoc, userId: string) => doc.members.some((m) => m.userId === userId);
const pendingCount = (doc: CircleDoc) => doc.applications.length + doc.invites.length;
const dropRequests = (doc: CircleDoc, userId: string) => {
  doc.applications = doc.applications.filter((r) => r.userId !== userId);
  doc.invites = doc.invites.filter((r) => r.userId !== userId);
  doc.rejected = doc.rejected.filter((r) => r.userId !== userId);
};
const freshRejections = (doc: CircleDoc, now: Date) =>
  doc.rejected.filter((r) => now.getTime() - Date.parse(r.at) < CIRCLE_REAPPLY_COOLDOWN_MS);

/**
 * 一次操作。actorCircle / targetCircle：操作人和对方此刻在哪个同好会（没有为 null），由存储层查好传进来。
 * 不改传入的 doc；返回新的 doc（null = 解散）、新加入和离开的人。重复的申请 / 邀请 / 接受算成功、不改动（幂等）。
 */
export function applyCircleAction(
  current: CircleDoc,
  input: {
    action: CircleAction;
    actorId: string;
    targetId?: string;
    now: Date;
    actorCircle: string | null;
    targetCircle?: string | null;
    targetCounters?: CircleCounters;
    actorCounters?: CircleCounters;
  },
): CircleOutcome {
  const doc = clone(current);
  const { action, actorId, now } = input;
  const target = input.targetId ?? "";
  const at = now.toISOString();
  const leader = doc.leaderId === actorId;
  const needsLeader = ["approve", "reject", "invite", "kick", "transfer", "disband"].includes(action);
  if (needsLeader && !leader) return fail("not_leader");
  if (CIRCLE_TARGET_ACTIONS.includes(action)) {
    if (!target) return fail("user_not_found");
    if (target === actorId) return fail("self");
  }
  switch (action) {
    case "apply": {
      if (isMember(doc, actorId)) return same(current);
      if (input.actorCircle) return fail("already_in_circle");
      if (doc.applications.some((r) => r.userId === actorId)) return same(current);
      if (freshRejections(doc, now).some((r) => r.userId === actorId)) return fail("apply_cooldown");
      if (doc.members.length >= CIRCLE_MAX_MEMBERS) return fail("circle_full");
      if (pendingCount(doc) >= CIRCLE_PENDING_MAX) return fail("pending_full");
      doc.applications.push({ userId: actorId, at });
      return { ok: true, doc, joined: [], left: [], changed: true };
    }
    case "cancel_apply": {
      if (!doc.applications.some((r) => r.userId === actorId)) return same(current);
      doc.applications = doc.applications.filter((r) => r.userId !== actorId);
      return { ok: true, doc, joined: [], left: [], changed: true };
    }
    case "accept":
    case "approve": {
      const who = action === "accept" ? actorId : target;
      const list = action === "accept" ? doc.invites : doc.applications;
      if (isMember(doc, who)) return same(current);
      if (!list.some((r) => r.userId === who)) return fail("no_request");
      const elsewhere = action === "accept" ? input.actorCircle : input.targetCircle;
      if (elsewhere) return fail("already_in_circle");
      if (doc.members.length >= CIRCLE_MAX_MEMBERS) return fail("circle_full");
      dropRequests(doc, who);
      doc.members.push(member(who, now, action === "accept" ? input.actorCounters : input.targetCounters));
      return { ok: true, doc, joined: [who], left: [], changed: true };
    }
    case "reject": {
      if (!doc.applications.some((r) => r.userId === target)) return same(current);
      doc.applications = doc.applications.filter((r) => r.userId !== target);
      doc.rejected = [...freshRejections(doc, now).filter((r) => r.userId !== target), { userId: target, at }].slice(-CIRCLE_PENDING_MAX);
      return { ok: true, doc, joined: [], left: [], changed: true };
    }
    case "decline": {
      if (!doc.invites.some((r) => r.userId === actorId)) return same(current);
      doc.invites = doc.invites.filter((r) => r.userId !== actorId);
      return { ok: true, doc, joined: [], left: [], changed: true };
    }
    case "invite": {
      if (isMember(doc, target)) return same(current);
      // 对方已在别的会里：回执和成功一样，邀请不存、不提醒（不让会长借此探知对方在不在会里）
      if (input.targetCircle) return same(current);
      if (doc.invites.some((r) => r.userId === target)) return same(current);
      if (doc.members.length >= CIRCLE_MAX_MEMBERS) return fail("circle_full");
      if (pendingCount(doc) >= CIRCLE_PENDING_MAX) return fail("pending_full");
      doc.invites.push({ userId: target, at });
      return { ok: true, doc, joined: [], left: [], changed: true };
    }
    case "leave": {
      if (!isMember(doc, actorId)) return fail("not_in_circle");
      if (leader) {
        if (doc.members.length > 1) return fail("leader_must_transfer");
        return { ok: true, doc: null, joined: [], left: [actorId], changed: true };
      }
      doc.members = doc.members.filter((m) => m.userId !== actorId);
      return { ok: true, doc, joined: [], left: [actorId], changed: true };
    }
    case "kick": {
      if (!isMember(doc, target)) return fail("not_member");
      doc.members = doc.members.filter((m) => m.userId !== target);
      return { ok: true, doc, joined: [], left: [target], changed: true };
    }
    case "transfer": {
      if (!isMember(doc, target)) return fail("not_member");
      doc.leaderId = target;
      return { ok: true, doc, joined: [], left: [], changed: true, leaderChanged: target };
    }
    case "disband":
      return { ok: true, doc: null, joined: [], left: doc.members.map((m) => m.userId), changed: true };
  }
}

/**
 * 某人加入了别的会：把他在这个会的申请、收到的邀请删掉（拒绝记录留着，冷却照旧）。没有要删的返回 null。
 */
export function withdrawPending(current: CircleDoc, userId: string): CircleDoc | null {
  if (![...current.applications, ...current.invites].some((r) => r.userId === userId)) return null;
  const doc = clone(current);
  doc.applications = doc.applications.filter((r) => r.userId !== userId);
  doc.invites = doc.invites.filter((r) => r.userId !== userId);
  return doc;
}

/** 注销：从成员、申请、邀请里删掉；会长转给最早加入的成员，没有成员就解散。 */
export function removeAccountFromCircle(current: CircleDoc, userId: string): CircleOutcome {
  const doc = clone(current);
  const wasMember = isMember(doc, userId);
  const hadRequest = [...doc.applications, ...doc.invites, ...doc.rejected].some((r) => r.userId === userId);
  if (!wasMember && !hadRequest) return same(current);
  dropRequests(doc, userId);
  if (!wasMember) return { ok: true, doc, joined: [], left: [], changed: true };
  let leaderChanged: string | undefined;
  if (doc.leaderId === userId) {
    const next = nextLeader(doc, userId);
    if (!next) return { ok: true, doc: null, joined: [], left: [userId], changed: true };
    doc.leaderId = next;
    leaderChanged = next;
  }
  doc.members = doc.members.filter((m) => m.userId !== userId);
  return { ok: true, doc, joined: [], left: [userId], changed: true, ...(leaderChanged ? { leaderChanged } : {}) };
}

export function circleSummary(doc: CircleDoc): CircleSummary {
  return { id: doc.id, name: shownCircleName(doc.name), memberCount: doc.members.length, max: CIRCLE_MAX_MEMBERS };
}

/** 搜索：名字按比较用的写法包含查询词；空查询列人多的。 */
export function matchesCircleQuery(doc: Pick<CircleDoc, "nameKey">, query: string): boolean {
  const q = circleNameKey(query);
  return !q || doc.nameKey.includes(q);
}

/**
 * 团榜：每个会的分数 = 成员里能上真人榜的人（起过名字、数据正常，见 leaderboard.ts）的总等级相加；没上榜的成员算 0。
 * 只列会名和分数，不列成员；用真人榜同一套缓存（createRankCache）与名次规则，会名照样打码。
 */
export const CIRCLE_BOARD_SNAPSHOT_MS = 5_000;
export function circleBoardMe(
  circle: { id: string; name: string; score: number } | null,
): { name: string; total: number; combat: number; zone: number } | "no_name" {
  return circle ? { name: shownCircleName(circle.name), total: circle.score, combat: 0, zone: 0 } : "no_name";
}

/** 文档读出来时补默认值（旧数据、库里缺字段）。 */
export function normalizeCircleDoc(raw: any): CircleDoc | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.leaderId !== "string" || typeof raw.name !== "string") return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((r) => r && typeof r.userId === "string") : []);
  return {
    id: raw.id,
    name: raw.name,
    nameKey: typeof raw.nameKey === "string" ? raw.nameKey : circleNameKey(raw.name),
    leaderId: raw.leaderId,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(0).toISOString(),
    members: list(raw.members),
    applications: list(raw.applications),
    invites: list(raw.invites),
    rejected: list(raw.rejected),
  };
}
