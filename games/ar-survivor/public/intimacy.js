// intimacy.js — AR-G2 亲密长期线的纯规则（不碰 DOM / 存储，浏览器与 node 单测共用）
//
// 【为什么要有「节奏」】
// 原来亲密只靠经验：每级需求 ×1.3（打工掉落那条路是 ×1.35），所有互动都能无限次涨
// （摸头 8、聊天约 20、猜拳 15~24、站在码农工位旁每 4 秒 8、打工每只小怪掉落 14……），
// 打十分钟工就有上千经验，认真玩一天能冲过 LV.20，撑不起「几个月的陪伴」。
// 所以 LV.8 起改成按「相处的日子」走，LV.8 以前照旧（LV.1→LV.8 共约 700 经验，第 1~2 天）：
//   · 每个自然日有 200 份全额计入；没来的日子份额会攒着，最多攒 7 天，隔几天再来不会落后
//   · 份额用完后，其余互动按 10% 慢慢计入，一天最多再 40
//   · 打工掉落（打工为辅）只走这 40 的慢速份额，不占陪伴的 200
//   · 用完不提示、不催促；界面上不显示「今天还差多少」
//
// 【各级需求与大约天数】LV.n → LV.n+1 需要 200 ×（n − 6），也就是 2、3、4 … 13 个满额陪伴日
//   升到   9  10  11  12  13  14  15  16  17  18  19  20
//   本级   2   3   4   5   6   7   8   9  10  11  12  13  天（每天 200）
//   累计   2   5   9  14  20  27  35  44  54  65  77  90  天（从 LV.8 起算）
//   每天约 140（只摸摸头、盖个章、完成一个心愿）约 129 天；每天 240（全满）约 75 天。
// 每日能涨多少的来源明细见 docs/INTIMACY.md。

export const BOND_VERSION = 1;
export const BOND_PACE_LEVEL = 8;
export const BOND_FINAL_LEVEL = 20;
export const BOND_DAY_XP = 200;
export const BOND_BANK_DAYS = 7;
export const BOND_TAIL_RATE = 0.1;
export const BOND_TAIL_DAY_XP = 40;
export const BOND_DEFAULT_CALL = '主人';
// 礼物早就有了时，改成这些金币（轻奖励，不追溯差价）
export const BOND_DUP_GIFT_COINS = 60;

// 每级一页手账 + 一个轻奖励：call 称呼 / line 新台词 / gift 已有装扮（不新增美术与物件）
export const BOND_MILESTONES = [
  { level: 9, kind: 'call', call: '搭档', title: '可以换称呼了', img: './assets/ui_btn_chat.webp?v=hd60', page: '已经很熟啦，也可以叫你「搭档」。' },
  { level: 10, kind: 'line', title: '窗边的位置', img: './assets/win_morning.webp?v=hd19', page: '窗边一直给你留着一个位置。', line: '窗边给你留了位置哦~' },
  { level: 11, kind: 'gift', itemId: 'bow', title: '樱粉蝴蝶结', img: './assets/item_bow.webp?v=hd60', page: '第一次一起挑的发饰。' },
  { level: 12, kind: 'line', title: '习惯了', img: './assets/win_dusk.webp?v=hd19', page: '听见脚步声，就知道是你。', line: '听脚步声就知道是你~' },
  { level: 13, kind: 'call', call: '老朋友', title: '老朋友', img: './assets/letter_envelope.webp?v=hd60', page: '这么多天下来，算老朋友了。' },
  { level: 14, kind: 'gift', itemId: 'cushion', title: '蓝鲸软垫窝', img: './assets/prop_cushion.webp?v=hd60', page: '午觉的地方，分你一半。' },
  { level: 15, kind: 'line', title: '下雨的下午', img: './assets/watercolor_rainy_window.webp?v=hd31', page: '下雨也好，反正在屋里。', line: '下雨天就一起待着吧~' },
  { level: 16, kind: 'gift', itemId: 'toy_yarn', title: '猫薄荷毛线球', img: './assets/toy_yarn.webp?v=hd60', page: '滚到桌子底下，又一起找了回来。' },
  { level: 17, kind: 'call', call: '家人', title: '家人', img: './assets/handmade_card.webp?v=hd60', page: '可以叫你「家人」了。' },
  { level: 18, kind: 'gift', itemId: 'crown', title: '迷你小皇冠', img: './assets/item_crown.webp?v=hd60', page: '给你戴一下，再还给我。' },
  { level: 19, kind: 'line', title: '慢慢来', img: './assets/win_starry.webp?v=hd19', page: '不着急，日子还长。', line: '不着急，慢慢来~' },
  { level: 20, kind: 'anniversary', itemId: 'aura', title: '纪念日', img: './assets/hero_pose_cheer.webp?v=hd5', page: '这一天记下来了。以后想来就来。', line: '今天也是普通又好的一天~' }
];

const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayNumber(dayKey) {
  const m = DAY_KEY_RE.exec(String(dayKey || ''));
  if (!m) return null;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// LV.8 起的固定需求；LV.20 之后不再升级，这个值只用来把经验条填满
export function bondXpNeed(level) {
  const lv = Math.max(BOND_PACE_LEVEL, Math.floor(toNum(level, BOND_PACE_LEVEL)));
  return BOND_DAY_XP * (Math.min(lv, BOND_FINAL_LEVEL) - 6);
}

// 升到 nextLevel 后的下一级需求：LV.8 以前照旧 ×1.3，LV.8 起走固定表
export function nextXpNeed(nextLevel, currentNeed) {
  if (nextLevel >= BOND_PACE_LEVEL) return bondXpNeed(nextLevel);
  return Math.max(1, Math.round(toNum(currentNeed, 40) * 1.3));
}

function freshPace(dayKey) {
  return { day: dayNumber(dayKey) === null ? '' : dayKey, left: BOND_DAY_XP, tail: BOND_TAIL_DAY_XP, carry: 0 };
}

// 到了新的一天补份额；没来的日子也补，最多攒 7 天。把时钟往回拨不补也不扣；
// 回拨超过一天（例如曾经把年份调错）就从现在的日子重新数，不然要等到那一天才会再补
export function refillPace(pace, dayKey) {
  const today = dayNumber(dayKey);
  const last = dayNumber(pace && pace.day);
  if (today === null) return pace ? { ...pace } : freshPace('');
  if (last === null) return freshPace(dayKey);
  const cur = {
    day: pace.day,
    left: Math.max(0, Math.min(BOND_DAY_XP * BOND_BANK_DAYS, toNum(pace.left))),
    tail: Math.max(0, Math.min(BOND_TAIL_DAY_XP, toNum(pace.tail))),
    carry: Math.max(0, Math.min(0.999, toNum(pace.carry)))
  };
  const passed = today - last;
  if (passed < -1) return { ...cur, day: dayKey };
  if (passed <= 0) return cur;
  return {
    day: dayKey,
    left: Math.min(BOND_DAY_XP * BOND_BANK_DAYS, cur.left + BOND_DAY_XP * passed),
    tail: BOND_TAIL_DAY_XP,
    carry: cur.carry
  };
}

// 这次互动真正计入多少亲密。source: 'care' 陪伴互动 / 'work' 打工掉落
export function countBondXp({ level, amount, pace, dayKey, source = 'care' }) {
  const gain = Math.max(0, Math.round(toNum(amount)));
  if (level < BOND_PACE_LEVEL) return { counted: gain, pace };
  const next = refillPace(pace, dayKey);
  if (level >= BOND_FINAL_LEVEL) return { counted: 0, pace: next };
  const full = source === 'work' ? 0 : Math.min(next.left, gain);
  next.left -= full;
  const slow = Math.min(next.tail, (gain - full) * BOND_TAIL_RATE);
  next.tail = Math.round((next.tail - slow) * 1000) / 1000;
  const acc = next.carry + slow;
  const whole = Math.floor(acc + 1e-9);
  next.carry = Math.max(0, Math.round((acc - whole) * 1000) / 1000);
  return { counted: full + whole, pace: next };
}

// 把计入的亲密加上去，返回新的等级 / 经验与升了几级
export function applyBondXp({ level, xp, xpNext }, counted) {
  let lv = Math.max(1, Math.floor(toNum(level, 1)));
  let cur = Math.max(0, toNum(xp)) + Math.max(0, toNum(counted));
  let need = lv >= BOND_PACE_LEVEL ? bondXpNeed(lv) : Math.max(1, toNum(xpNext, 40));
  let gained = 0;
  while (lv < BOND_FINAL_LEVEL && cur >= need) {
    cur -= need;
    lv += 1;
    gained += 1;
    need = nextXpNeed(lv, need);
  }
  if (lv >= BOND_FINAL_LEVEL) cur = need;
  return { level: lv, xp: cur, xpNext: need, gained };
}

// 读档：新字段给默认值；老存档（没有 bond）LV.8 以上按原来的百分比换算到新需求，等级一级不掉
export function loadBond(saved = {}, dayKey = '') {
  const level = Math.max(1, Math.floor(toNum(saved.level, 1)));
  const raw = saved.bond && typeof saved.bond === 'object' ? saved.bond : null;
  const legacy = !raw || raw.v !== BOND_VERSION;
  const savedNeed = toNum(saved.xpNext, 0) > 0 ? toNum(saved.xpNext) : 40;
  const savedXp = Math.max(0, toNum(saved.xp));
  let xp = savedXp;
  let xpNext = savedNeed;
  if (level >= BOND_PACE_LEVEL) {
    xpNext = bondXpNeed(level);
    if (level >= BOND_FINAL_LEVEL) xp = xpNext;
    else if (legacy) xp = Math.floor(Math.min(0.999, savedXp / savedNeed) * xpNext);
    else xp = Math.min(savedXp, xpNext - 1);
  }
  const claimed = {};
  for (const m of BOND_MILESTONES) {
    const src = raw && raw.claimed && typeof raw.claimed === 'object' ? raw.claimed : {};
    if (String(m.level) in src && level >= m.level) claimed[m.level] = dayNumber(src[m.level]) === null ? '' : src[m.level];
  }
  const bond = {
    v: BOND_VERSION,
    pace: refillPace(raw && raw.pace && dayNumber(raw.pace.day) !== null ? raw.pace : null, dayKey),
    claimed,
    call: sanitizeCall(raw && raw.call, level),
    seen: Math.max(0, Math.floor(toNum(raw && raw.seen)))
  };
  return { level, xp, xpNext, bond, legacy };
}

// 还没发过的里程碑（老玩家第一次进来可能一次有很多条，由界面合并成一条提示）
export function pendingMilestones(level, claimed = {}) {
  return BOND_MILESTONES.filter((m) => level >= m.level && !(String(m.level) in claimed));
}

// 发奖：纯数据，返回要改的东西。礼物已经有了就改成金币，绝不重复发
export function grantMilestones(level, bond, ownedDress = {}, dayKey = '') {
  const list = pendingMilestones(level, bond.claimed);
  const owned = new Set(Object.keys(ownedDress).filter((k) => ownedDress[k]));
  const items = [];
  let coins = 0;
  const claimed = { ...bond.claimed };
  for (const m of list) {
    claimed[m.level] = dayKey;
    if (!m.itemId) continue;
    if (owned.has(m.itemId)) coins += BOND_DUP_GIFT_COINS;
    else {
      owned.add(m.itemId);
      items.push(m.itemId);
    }
  }
  return { list, items, coins, claimed };
}

// 一条提示说完：一级就说这一级，多级合并成一条
export function describeGrant(list, { items = [], coins = 0 } = {}) {
  if (!list.length) return null;
  const last = list[list.length - 1];
  if (list.length === 1) {
    const extra =
      last.kind === 'call'
        ? '手账里可以换'
        : last.kind === 'line'
          ? '她多了一句话'
          : coins > 0
            ? `换成金币 ${coins}`
            : items.length
              ? last.kind === 'anniversary'
                ? '送你星光光环'
                : '已放进装扮'
              : '';
    return { level: last.level, img: last.img, badge: `亲密 LV.${last.level}`, title: last.title, desc: `${last.page}${extra}` };
  }
  const gift = [items.length ? `装扮 ${items.length} 件` : '', coins > 0 ? `金币 ${coins}` : ''].filter(Boolean).join('，');
  return {
    level: last.level,
    img: last.img,
    badge: `亲密 LV.${list[0].level}~${last.level}`,
    title: `手账补上 ${list.length} 页`,
    desc: gift ? `${gift}，都收好了` : '都收进手账了'
  };
}

export function unlockedCalls(level) {
  return [BOND_DEFAULT_CALL, ...BOND_MILESTONES.filter((m) => m.kind === 'call' && level >= m.level).map((m) => m.call)];
}

export function sanitizeCall(call, level) {
  return unlockedCalls(level).includes(call) ? call : BOND_DEFAULT_CALL;
}

export function unlockedLines(level) {
  return BOND_MILESTONES.filter((m) => m.line && level >= m.level).map((m) => m.line);
}

// 她说的话里的称呼
export function applyCallName(text, call) {
  const s = String(text ?? '');
  return call && call !== BOND_DEFAULT_CALL ? s.split(BOND_DEFAULT_CALL).join(call) : s;
}

// 飘字里的数字跟着真正计入的走；一点没计入时只留动作名，不显示 +0
export function bondFloatLabel(label, gain, counted) {
  if (!label) return counted > 0 ? `+${counted} 亲密` : '开心';
  if (counted >= gain) return label;
  if (counted > 0) return label.replace(/\+\d+/, `+${counted}`);
  return label.replace(/\+\d+(\s*亲密)?/, '').replace(/\s{2,}/g, ' ').trim() || '开心';
}
