/**
 * 隐私说明与用户协议（草案）。只写代码里真实存在的数据行为：
 *   - 本地存档：State.ts save()/load()，localStorage 键 swarm_control_3d_save_v3
 *   - 周榜上报：State.ts syncRemoteLeaderboard() -> deploy/worker.mjs POST /api/leaderboard（KV 14 天过期）
 *   - 分享链接：State.ts buildShareChallengeText() / checkAndClaimReferralWelcome()
 *   - 昵称过滤与举报：game/nameFilter.mjs + nameBlocklist.mjs；State.ts reportLeaderboardName() -> worker.mjs POST /api/leaderboard/report
 * 改动这几处时要同步改这里，scripts/legal_facts.test.mjs 会核对里面的数字。
 */

/** 草案开关：正式文本由用户确认、占位全部填完之前必须为 true，页面会一直显示「草案，尚未生效」。 */
export const LEGAL_DRAFT = true;

export type LegalDocId = 'privacy' | 'terms';

export interface LegalSection {
  heading: string;
  items: string[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  sections: LegalSection[];
}

const OPERATOR = '【待填：运营主体名称】';
const CONTACT = '【待填：联系邮箱】';
const JURISDICTION = '【待填：适用法律与管辖地】';
const LOG_KEEP = '【待填：日志留多久】';

export const LEGAL_DOCS: Record<LegalDocId, LegalDoc> = {
  privacy: {
    id: 'privacy',
    title: '隐私说明',
    sections: [
      {
        heading: '谁在处理数据',
        items: [`运营者：${OPERATOR}。联系方式：${CONTACT}。`],
      },
      {
        heading: '存在你设备上的',
        items: [
          '游戏存档：关卡进度、货币、升级与收藏、统计、昵称，以及三个随机生成的值：玩家编号、分享编号、周榜写入密钥。',
          '存档只放在浏览器本地存储里，除下面「周榜」「举报」列出的几项外不上传；清除浏览器网站数据就会删掉。',
          '不用 Cookie，没有广告、第三方统计和支付，我们不做统计。',
        ],
      },
      {
        heading: '会上传的（周榜）',
        items: [
          '内容：玩家编号、写入密钥、昵称、本周最高关卡、本周击败数、本周游戏时长、皮肤名与颜色；服务器另记公开编号和更新时间。',
          '写入密钥用来防止别人改你的成绩：服务器只存它的哈希值，不存原文。',
          '时机：本周有成绩或玩满 30 秒后，打开封面页、进入主菜单、打完一关、改名后自动上传（服务器忙时过几秒到一分钟补传一次）；没有成绩时只读取榜单。',
          '公开范围：昵称、成绩、时长、皮肤名与颜色，加一个不能反推出编号和密钥的公开编号，所有人都能看到。昵称请不要用真名、电话等个人信息。',
          '不公开：玩家编号、密钥哈希、更新时间。',
          '保存时间：每周一张新榜，只留前 100 名；整张榜最后一次有人写入后 14 天自动过期。',
        ],
      },
      {
        heading: '昵称过滤与举报',
        items: [
          '昵称会先过一份屏蔽词表（辱骂、色情、歧视、冒充官方或陪练）：改名时命中就不让改；榜上的昵称命中时显示成默认名「应援团长」加四位数。',
          '举报：点榜上昵称旁的小旗。只有本周已上榜的玩家能举报；同一人举报同一行只算一次，每人同时最多有 10 条举报在记录里。',
          '举报时上传：你的写入密钥（只用来确认你本周在榜上，不保存）、被举报那行的公开编号、原因。',
          '服务器保存：被举报的公开编号、被举报时昵称的哈希、各原因的次数、举报人的公开编号、第一次和最近一次举报时间、处理状态。只有管理员能看。',
          '被 3 个不同玩家举报的行，昵称先显示成默认名，直到人工处理（恢复或继续隐藏）；成绩照常显示。改名后旧的举报不再算，新名字照常显示。',
          '保存时间：每条举报记录在最后一次举报或处理后 30 天删除；最多同时记录 200 个被举报的行，满了先删最早的、人数还没到的记录。',
        ],
      },
      {
        heading: '分享链接',
        items: [
          '点「分享」会复制一段文字到剪贴板：关卡、用时或游戏时长、击退数，加一个带有你分享编号和昵称的链接。发给谁由你决定。',
          '别人用你的链接打开游戏时，会在他的设备上记下你的分享编号，防止重复领取见面礼。编号和昵称写在网址里，网站托管方处理这次访问时会看到。',
        ],
      },
      {
        heading: '网络服务商',
        items: [
          `Cloudflare：托管网站和榜单，访问时会处理你的 IP 地址和浏览器信息。${LOG_KEEP}`,
          `网站里找不到的网址，请求会原样转到源站 yinosites.com，源站也会看到这些信息。${LOG_KEEP}`,
          '游戏代码本身不读取、不保存 IP 地址。',
        ],
      },
      {
        heading: '你可以做什么',
        items: [
          '删除本地数据：清除浏览器的网站数据。',
          `删除榜上记录：游戏里没有删除按钮，等它到期，或联系 ${CONTACT}。`,
        ],
      },
      {
        heading: '未成年人',
        items: ['【待填：未成年人保护与监护人说明】'],
      },
    ],
  },
  terms: {
    id: 'terms',
    title: '用户协议',
    sections: [
      {
        heading: '服务',
        items: [
          `《波波应援团：蒸汽工坊 3D》由 ${OPERATOR} 提供。`,
          '目前没有充值、没有广告，游戏内货币和道具不能兑换现金。',
        ],
      },
      {
        heading: '存档',
        items: ['存档只在你的设备上，没有导出和云存档。换设备、清除浏览器数据都会丢失，无法找回。'],
      },
      {
        heading: '昵称与周榜',
        items: [
          '昵称不得冒充他人，不得含违法、辱骂、广告内容或个人信息。',
          '昵称命中屏蔽词会被拒绝或显示成默认名；被多名玩家举报的昵称会先隐藏，等人工处理。',
          '不得伪造成绩、干扰服务器或用程序刷榜；违规记录可能被移除。',
          '榜上标「陪练」的是机器人，不是真人玩家。',
        ],
      },
      {
        heading: '随机扭蛋',
        items: ['扭蛋只用游戏内获得的货币，概率与保底在扭蛋页面公示，只有外观和少量金币收藏加成。'],
      },
      {
        heading: '变更与责任',
        items: [
          '游戏可能更新、调整数值或停止服务。',
          `适用法律与争议解决：${JURISDICTION}。`,
          `联系方式：${CONTACT}。`,
        ],
      },
    ],
  },
};
