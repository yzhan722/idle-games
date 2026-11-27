/**
 * 角色名的共同规则（设置接口与真人榜共用）。名字会进聊天、播报和榜单，看不见的字、叠字符、冒充系统的都不收。
 * 只管新起的名字能不能存、能不能上榜；已经存下的名字不改，给别人看时命中屏蔽词的字打码（name_filter.ts）。
 */
import { PARTY_BOT_PROFILES } from "./party_bots";
import { isBlockedName, maskBlockedName } from "./name_filter";

export const DISPLAY_NAME_MAX = 16;

/** 控制符、格式符（含双向文字与零宽）、残缺的代理对（PostgreSQL 的 jsonb 存不了）、私用区、行段分隔、标签与引号。 */
const FORBIDDEN = /[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}<>"'`\\/]/u;
/** 归在字母、符号里但显示成空白的字：谚文填充符、盲文空格等。 */
const INVISIBLE = new Set([0x034f, 0x115f, 0x1160, 0x17b4, 0x17b5, 0x2800, 0x3164, 0xffa0]);
/** 一个字上叠三个以上附加符号会盖到别的行。 */
const STACKED = /\p{M}{3,}/u;

/** 名字能不能放心显示给别人：长度合适、看得见、不带特殊字符。 */
export function isPlainDisplayName(name: string): boolean {
  if (!name.trim() || name.length > DISPLAY_NAME_MAX) return false;
  if (FORBIDDEN.test(name) || STACKED.test(name.normalize("NFC"))) return false;
  if ([...name].some((c) => INVISIBLE.has(c.codePointAt(0)!))) return false;
  return /[^\p{M}\p{Z}\s]/u.test(name);
}

/** 比较用：全角半角、大小写、空白、附加符号的差别都不算。 */
export function canonicalName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/[\s\p{Z}\p{M}]+/gu, "");
}

const OFFICIAL_NAMES = ["系统", "系统公告", "系统消息", "官方", "客服", "官方客服", "管理员", "gm", "admin", "商会补给站"];
const bare = (s: string) => canonicalName(s).replace(/[^\p{L}\p{N}]+/gu, "");

/** 系统账号和官方口吻的名字：只换空格、标点、全半角也算同名。 */
export function isReservedName(name: string): boolean {
  const mine = bare(name);
  return mine !== "" && (OFFICIAL_NAMES.some((n) => bare(n) === mine) || PARTY_BOT_PROFILES.some((p) => bare(p.name) === mine));
}

/** 名字与登录账号名相同时，公开榜单只露第一个字（账号名只有一个字就一个都不露）；旧名字命中屏蔽词的字打码。只影响展示。 */
export function maskAccountName(name: string, username: string | null | undefined): string {
  if (!username || canonicalName(name) !== canonicalName(username)) return maskBlockedName(name);
  const chars = [...name];
  return chars.length > 1 ? `${chars[0]}＊＊` : "＊＊";
}

/** 新起的名字能不能存：看得见、不冒充系统、没有屏蔽词。建角和改名走同一个接口。 */
export function isAcceptableNewName(name: string): boolean {
  return isPlainDisplayName(name) && !isReservedName(name) && !isBlockedName(name);
}

/** 给别人看的名字（聊天、播报、队伍）：没起名用「玩家_」加编号前 6 位；旧名字命中屏蔽词打码。 */
export function shownName(userId: string, raw: string | null | undefined): string {
  const name = raw?.trim();
  return name ? maskBlockedName(name) : `玩家_${userId.slice(0, 6)}`;
}
