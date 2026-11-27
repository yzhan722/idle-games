// 周榜昵称过滤：前端改名（State.ts）和 Worker 写入 / 读出（deploy/worker.mjs）共用这一份。
// 纯 ESM、不依赖浏览器或 Node 的 API，Worker 能直接 import。词表在 nameBlocklist.mjs，人工增删。
import { BOT_NAMES, NAME_BLOCKLIST } from './nameBlocklist.mjs';

// 西里尔 / 希腊字母里长得像拉丁字母的几个
const HOMOGLYPHS = {
  а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
  і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', α: 'a', ο: 'o', ρ: 'p', ν: 'v', τ: 't', κ: 'k', ι: 'i',
};
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't' };

/** 全角转半角、去附加符号与零宽字符、小写、形近字母换拉丁字母。保留空格和标点（分词要用）。 */
function fold(raw) {
  return String(raw ?? '')
    .normalize('NFKD')
    .replace(/[\p{M}\p{Cf}\p{Cc}]/gu, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[Ͱ-ϿЀ-ԯɡ]/g, (c) => HOMOGLYPHS[c] || c);
}

/** 英文里把 @ $ ! 当 a s i 读（另算一份，免得「傻@逼」被读成「傻a逼」反而漏掉）。 */
const symbolsAsLetters = (folded) => folded.replace(/@/g, 'a').replace(/\$/g, 's').replace(/!/g, 'i');

/** 一段英文字母数字里只要有字母，就把数字当字母再读一遍（纯数字不动，默认名「应援团长1234」不会被读成单词）。 */
const leetRuns = (s) => s.replace(/[a-z0-9]+/g, (run) => (/[a-z]/.test(run) ? run.replace(/[013457]/g, (d) => LEET[d]) : run));

/** 去掉空格、标点、符号后的紧凑形式。 */
const compact = (folded) => folded.replace(/[^\p{L}\p{N}]/gu, '');

/** 连写的重复英文字母压成一个（fuuuck → fuck）。只拿去比本身没有连写字母的词（ass 压成 as 会误伤）。 */
const squeeze = (s) => s.replace(/([a-z])\1+/g, '$1');
const hasDouble = (t) => /([a-z])\1/.test(t);

/** 驼峰拆成两个词（TheAdmin → The Admin）；另算一份，免得 aDmIn 这种大小写交替被拆散反而漏掉。 */
const splitCamel = (raw) => String(raw ?? '').replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2');

/** 英文整词：每段字母数字里的纯字母片段（原样和按 leet 读各一份），再把被空格拆开的单个字母拼回去。 */
function wordsOf(folded) {
  const runs = folded.match(/[a-z0-9]+/g) || [];
  const words = new Set();
  const lettersOf = (s) => (s.match(/[a-z]+/g) || []).forEach((w) => words.add(w));
  for (const run of runs) {
    lettersOf(run);
    if (/[a-z]/.test(run)) lettersOf(leetRuns(run));
  }
  // f u c k / a.d.m.i.n：被空格、标点隔开的连续单字母拼成一个词（不跨汉字）
  for (const chunk of folded.split(/[^\x00-\x7f]+/)) {
    let acc = '';
    const flush = () => {
      if (acc.length >= 2) {
        lettersOf(acc);
        lettersOf(leetRuns(acc));
      }
      acc = '';
    };
    for (const t of chunk.match(/[a-z0-9]+/g) || []) {
      if (t.length === 1) acc += t;
      else flush();
    }
    flush();
  }
  return words;
}

const prepared = Object.entries(NAME_BLOCKLIST).map(([category, { substrings = [], words = [] }]) => {
  const subs = substrings.map((t) => compact(fold(t))).filter(Boolean);
  const ws = words.map((t) => fold(t));
  return {
    category,
    substrings: subs,
    squeezable: subs.filter((t) => !hasDouble(t)),
    words: new Set(ws),
    squeezableWords: new Set(ws.filter((t) => !hasDouble(t))),
  };
});
const botNames = BOT_NAMES.map((n) => compact(fold(n))).filter(Boolean);

/** 命中返回 { category, term }，没命中返回 null。category：insult / sexual / hate / impersonation。 */
export function findBlockedTerm(raw) {
  const folded = fold(raw);
  const plain = compact(folded);
  if (!plain) return null;
  const asLetters = symbolsAsLetters(folded);
  const leet = leetRuns(compact(asLetters));
  const squeezed = [squeeze(plain), squeeze(leet)];
  const camel = fold(splitCamel(raw));
  const words = new Set([...wordsOf(folded), ...wordsOf(asLetters), ...wordsOf(camel), ...wordsOf(symbolsAsLetters(camel))]);
  const squeezedWords = new Set([...words].map(squeeze));
  for (const { category, substrings, squeezable, words: blockedWords, squeezableWords } of prepared) {
    for (const term of substrings) {
      if (plain.includes(term) || leet.includes(term)) return { category, term };
    }
    for (const term of squeezable) {
      if (squeezed.some((s) => s.includes(term))) return { category, term };
    }
    for (const w of words) {
      if (blockedWords.has(w)) return { category, term: w };
    }
    for (const w of squeezedWords) {
      if (squeezableWords.has(w)) return { category, term: w };
    }
  }
  for (const term of botNames) {
    if (plain.includes(term)) return { category: 'impersonation', term };
  }
  return null;
}

export function isNameBlocked(raw) {
  return findBlockedTerm(raw) !== null;
}

/** 默认名：和新玩家的随机名同一格式（应援团长 + 四位数），数字由公开编号算出，同一行每次一样。 */
export function defaultNameFor(seed) {
  let h = 0;
  for (const ch of String(seed ?? '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `应援团长${1000 + (h % 9000)}`;
}

/** 榜上显示的名字：命中词表就换成默认名。 */
export function safeDisplayName(name, seed) {
  return isNameBlocked(name) ? defaultNameFor(seed ?? name) : String(name ?? '');
}
