/**
 * 账号注销的共同约定（内存与 PostgreSQL 两个存储都用这里的值）。
 *
 * 注销会做什么：
 * - 删除：账号（用户名、密码散列、游客恢复凭证、Google 标识）、整份存档、操作回执、强化委托与服务统计。
 * - 挂单：全部撤下。托管在挂单里的物品和金币属于这份存档，随存档一起删除，不退给任何人。
 * - 组队：退出队伍；队长注销等于解散队伍。发给别人的组队邀请一并删除。
 * - 同好会（circle.ts）：退出；会长注销转给最早加入的成员，没有成员就解散。他的申请、收到的邀请一并删除。
 * - 历史成交：保留物品、数量、价格、时间（行情要用），买卖双方编号改成 DELETED_ACCOUNT_ID，认不出是谁。
 * - 文件存储的旁路文件：主文件和 .bak 立即重写；提到这个账号的 .corrupt / .tmp 副本整份删除。
 * - 聊天：服务器不保存聊天记录。屏蔽名单（双方）、他发出的和针对他的举报一并删除，内存里最近消息中他说的也丢掉（chat_moderation.ts）。
 * - 排行榜：删掉这一行并清空榜单缓存。匿名统计只有每天的人数，认不出是谁，不变。
 * - 墓碑：只留一个随机编号和注销时间，TOMBSTONE_DAYS 天后清除，用来让断网重试得到「已注销」而不是报错。
 */
export const DELETED_ACCOUNT_ID = "00000000-0000-0000-0000-000000000000";

/** 与登录凭证的有效期（30 天）一致：过了这个时间，旧凭证本来就失效了。 */
export const TOMBSTONE_DAYS = 30;

/** 没有密码的账号（游客）用这句话代替密码确认。 */
export const DELETE_CONFIRM_TEXT = "注销账号";

export type AccountDeletionResult = { ordersRemoved: number };

export function tombstoneExpired(deletedAt: string, now: Date): boolean {
  const at = Date.parse(deletedAt);
  return !Number.isFinite(at) || now.getTime() - at > TOMBSTONE_DAYS * 24 * 3600_000;
}
