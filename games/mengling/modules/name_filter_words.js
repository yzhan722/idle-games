// 名字与播报屏蔽词表（ML-COM3）。人工可增删：直接在下面的数组里加词、删词，改完跑一次
//   node scripts/social-safety-selfcheck.mjs
// 自检会把全部萌灵名、称号、纪元名和播报原文过一遍，误伤了就会失败。
//
// 两种比法（实现见 modules/name_filter.js）：
//   sub  —— 先全角转半角、大写转小写、去掉空格符号和零宽字符、把长得像拉丁字母的西里尔 / 希腊字母换掉，再看「包含」。中文词放这里。
//   word —— 英文按「整个词」比（字母连成一段才算），防止 class 里的 ass、badminton 里的 admin 被误伤。短英文词放这里。
// 数字当字母写（adm1n、f4g）也会认出来。
// 暂不处理（留给后续）：拼音首字母（如 sb、nmsl）、谐音字、拆字、繁简互换（需要的繁体词直接写进表里）。
// 词表故意小而保守：宁可漏，别误伤正常名字。命中只拒绝改名或打码显示，不封号。
//
// 分类：abuse 辱骂；sexual 色情；hate 仇恨；impersonation 冒充系统 / 官方 / 管理员。

// 放行词：屏蔽词只是常见词跨词凑出来的（「叫做爱丽丝」里的「做爱」、「路口交通」里的「口交」），
// 命中的字整个落在放行词里就不算。只比「sub」那种去掉空格的写法；放行词本身不过数字当字母。
export const NAME_FILTER_ALLOW = Object.freeze([
  "叫做爱", "看做爱", "当做爱", "做爱心", "做爱好",
  "口交通", "口交易", "口交流", "口交换", "口交接", "口交界",
  "援交流", "援交通", "援交换", "援交付",
  "印度支那",
]);

export const NAME_FILTER_WORDS = Object.freeze({
  abuse: Object.freeze({
    sub: [
      "傻逼", "傻b", "傻屄", "煞笔", "沙比", "操你", "草你妈", "草泥马", "肏", "婊子", "贱人", "贱货",
      "去死", "死全家", "智障", "脑残", "狗日的", "你妈的", "他妈的", "王八蛋", "杂种", "畜生",
      "fuck", "shit", "bitch", "asshole", "bastard", "dickhead", "wanker",
    ],
    word: ["ass", "cunt", "twat", "stfu", "kys"],
  }),
  sexual: Object.freeze({
    sub: [
      "色情", "黄片", "黄网", "约炮", "裸聊", "裸照", "做爱", "强奸", "轮奸", "卖淫", "嫖娼", "援交", "口交", "鸡巴", "屌",
      "porn", "hentai", "pussy", "penis", "vagina", "blowjob", "handjob", "boobs", "dildo", "orgasm", "whore", "slut",
    ],
    word: ["sex", "sexy", "xxx", "nsfw", "anal", "rape", "horny", "nude", "nudes", "milf"],
  }),
  hate: Object.freeze({
    sub: ["支那", "黑鬼", "纳粹", "希特勒", "白皮猪", "黄皮猴", "nigger", "nigga", "faggot", "hitler", "nazi", "retard"],
    word: ["fag", "kike", "chink", "heil", "kkk"],
  }),
  impersonation: Object.freeze({
    sub: [
      "官方", "管理员", "管理員", "客服", "系统", "系統", "运营", "運營", "版主", "开发者", "開發者", "公告",
      "administrator", "moderator", "official", "sysadmin",
    ],
    word: ["admin", "mod", "gm", "system", "staff", "sysop"],
  }),
});
