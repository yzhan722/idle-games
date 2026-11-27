// 周榜昵称屏蔽词表。人工可增删：只改这个文件，前端改名和 deploy/worker.mjs 写入 / 读出都会跟着变。
// 规则（nameFilter.mjs 负责）：比对前先做全角转半角、去掉空格、标点、零宽字符和附加符号、统一小写，
// 常见形近字母（西里尔字母）换成拉丁字母；英文里的 0 1 3 4 5 7 @ $ 也按字母再比一次。
//   - substrings：去掉空格和符号后只要包含就算命中。中文词和不会误伤别的单词的长英文词放这里。
//   - words：英文短词，只在整词出现时命中（字母前后不是别的字母），免得 class、grape、peacock 这类被误伤。
//     会撞上拼音或人名的英文词也放这里：shit（shitou 石头、shitang 食堂）、cunt（cuntou 村头）、nazi（Nazir）。
//   - 中文词别收太短：去死（过去死磕）、日你（今日你好）、运营（幸运营地）都会误伤，只收带上下文的写法。
//   英文还会把连写的重复字母压成一个再比（fuuuck、shiiit），驼峰拆开再比（TheAdmin）。
// 词表故意保持小而保守：宁可漏几个，也不要把正常昵称拦掉；漏掉的靠榜单举报。
// 繁体只收了几个最常见的写法，形近汉字、拼音缩写不做。

export const NAME_BLOCKLIST = {
  // 辱骂
  insult: {
    substrings: [
      '傻逼', '傻b', '傻屄', '煞笔', '沙比', '操你', '草你', '艹你', '草泥马', '你妈的', '他妈的', '妈逼',
      '日你妈', '日你娘', '狗日', '贱人', '婊子', '脑残', '智障', '杂种', '畜生', '王八蛋', '去死吧', '你去死', '屌',
      'fuck', 'bullshit', 'bitch', 'asshole', 'motherf', 'retard', 'whore', 'slut',
    ],
    words: ['ass', 'sb', 'nmsl', 'stfu', 'dick', 'cock', 'idiot', 'shit', 'shits', 'shitty', 'cunt', 'cunts'],
  },
  // 色情
  sexual: {
    substrings: [
      '色情', '黄片', '约炮', '卖淫', '嫖', '裸聊', '裸体', '做爱', '性交', '口交', '鸡巴', '阴茎', '阴道', '自慰',
      '强奸', '強姦', '轮奸', '迷奸', '淫', '骚货', '精液', '乳交',
      'porn', 'hentai', 'penis', 'vagina', 'pussy', 'blowjob', 'boobs',
    ],
    words: ['sex', 'sexy', 'xxx', 'nude', 'nudes', 'rape', 'tits', 'milf', 'cum'],
  },
  // 仇恨、歧视
  hate: {
    substrings: ['支那', '黑鬼', '白皮猪', '小日本', '倭寇', '纳粹', '希特勒', '3k党', 'nigger', 'nigga', 'faggot', 'hitler'],
    words: ['kkk', 'fag', 'chink', 'jap', 'nazi', 'nazis'],
  },
  // 冒充官方、管理员、客服、陪练
  impersonation: {
    substrings: ['官方', '管理员', '管理員', '客服', '运营团队', '运营组', '版主', '超管', '系统消息', '系统公告', '开发者', '陪练', 'moderator', 'administrator'],
    words: ['admin', 'admins', 'gm', 'official', 'staff'],
  },
};

// 陪练（机器人）的名字：真人不能用，免得冒充陪练。和 deploy/worker.mjs 的 SEED_LEADERBOARD、
// src/game/State.ts 的 DEFAULT_LEADERBOARD 保持一致（scripts/name_filter.test.mjs 会核对）。
export const BOT_NAMES = [
  '薄荷小号手', '星梦应援团长', '焦糖布丁大王', '电音喵喵DJ', '兔耳魔法师',
  '青柠汽水波波', '蒸汽工坊克星', '草莓甜心主唱', '泡泡站长老王', '见习应援生',
];
