/**
 * 屏蔽词：名字不收、旧名字和聊天正文打码。词表在 shared/blocked_words.json，人工可增删。
 * 前后端各一份逐字相同的拷贝（只有引入词表那一行的相对路径不同）：backend/src/name_filter.ts 与
 * frontend/src/gameplay/nameFilter.ts，scripts/name-filter-parity.test.ts 比对。
 * 比较前：全角半角、大小写统一，0 1 3 4 5 7 @ $ 换回字母，空白、标点、附加符号去掉。
 * 打码只换命中的那几个字（中间夹的空格标点一起换成＊），别的字原样留着。
 * 防误伤：数字只在前后都是英文字母时才当字母（sh1t、a55hole 算；第455关、Lv.455、战力 2455 不算）；
 * 命中整个落在放行词（词表 allow，如「属性交易」「叫做爱丽丝」「路口交通」）里面不算；
 * 英文词跨了空格时要从词头到词尾（f u c k 算；finish it、who really 不算）。
 */
import WORDS from "../../../shared/blocked_words.json";

type WordList = { abuse: string[]; sexual: string[]; hate: string[]; impersonation: string[]; nameEdges: string[]; allow?: string[] };

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
const KEEP = /[\p{L}\p{N}]/u;
const DIGIT = /^[0-9]$/;
const LATIN = /^[a-z]$/;
export const MASK_CHAR = "＊";

type Flat = { text: string; at: number[]; chars: string[] };

/**
 * 折成比较用的文字；at[i] 是 text 第 i 个 UTF-16 单元来自原文第几个字（按码点数）。
 * 一串数字只有前后紧挨着的都是英文字母才换成字母，否则原样当数字。
 */
function flatten(s: string): Flat {
  const chars = [...s];
  const units: Array<{ c: string; i: number }> = [];
  chars.forEach((ch, i) => {
    for (const c of ch.normalize("NFKC").toLowerCase()) {
      if (KEEP.test(c) || LEET[c] !== undefined) units.push({ c, i });
    }
  });
  let text = "";
  const at: number[] = [];
  for (let k = 0; k < units.length; k++) {
    const { c, i } = units[k];
    let m = c;
    if (DIGIT.test(c)) {
      let a = k;
      let b = k;
      while (a > 0 && DIGIT.test(units[a - 1].c)) a--;
      while (b < units.length - 1 && DIGIT.test(units[b + 1].c)) b++;
      if (LEET[c] && LATIN.test(units[a - 1]?.c ?? "") && LATIN.test(units[b + 1]?.c ?? "")) m = LEET[c];
    } else if (LEET[c] !== undefined) {
      m = LEET[c];
    }
    text += m;
    for (let j = 0; j < m.length; j++) at.push(i);
  }
  return { text, at, chars };
}

/** 比较用的写法（上面 flatten 的结果）：同好会名字查重与搜索也用这个口径，标点、空格不同算同名。 */
export function foldForCompare(text: string): string {
  return flatten(text).text;
}

const fold = (list: string[]) => list.map((w) => flatten(w).text).filter(Boolean);
const W = WORDS as WordList;
/** 聊天正文只查这三类；冒充官方只对名字有意义。 */
const CHAT_WORDS = fold([...W.abuse, ...W.sexual, ...W.hate]);
const NAME_WORDS = [...CHAT_WORDS, ...fold(W.impersonation)];
const NAME_EDGES = fold(W.nameEdges);
const ALLOW = fold(W.allow ?? []);

function spans(text: string, words: string[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const w of words) {
    for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) out.push([i, i + w.length]);
  }
  return out;
}

const latinWordChar = (ch: string | undefined) => !!ch && /^[a-z0-9]+$/.test(ch.normalize("NFKC").toLowerCase());

/** 英文词的命中跨了空格，却不是从一个词的词头到另一个词的词尾（finish it 里的 shit）。 */
function straddlesWords(flat: Flat, a: number, b: number): boolean {
  const from = flat.at[a];
  const to = flat.at[b - 1];
  let spaced = false;
  for (let i = from; i <= to; i++) if (/\s/u.test(flat.chars[i])) spaced = true;
  return spaced && (latinWordChar(flat.chars[from - 1]) || latinWordChar(flat.chars[to + 1]));
}

function findAll(flat: Flat, words: string[]): Array<[number, number]> {
  const allowed = spans(flat.text, ALLOW);
  return spans(flat.text, words).filter(([a, b]) => {
    if (allowed.some(([c, d]) => c <= a && b <= d)) return false;
    return !(/^[a-z]+$/.test(flat.text.slice(a, b)) && straddlesWords(flat, a, b));
  });
}

function nameHits(name: string) {
  const flat = flatten(name);
  const hits = findAll(flat, NAME_WORDS);
  for (const w of NAME_EDGES) {
    if (flat.text.startsWith(w)) hits.push([0, w.length]);
    if (flat.text.endsWith(w)) hits.push([flat.text.length - w.length, flat.text.length]);
  }
  return { flat, hits };
}

function mask(s: string, at: number[], hits: Array<[number, number]>): string {
  if (!hits.length) return s;
  const chars = [...s];
  for (const [a, b] of hits) for (let i = at[a]; i <= at[b - 1]; i++) chars[i] = MASK_CHAR;
  return chars.join("");
}

/** 名字里有屏蔽词（含冒充官方）：建角、改名都不收。 */
export function isBlockedName(name: string): boolean {
  return nameHits(name).hits.length > 0;
}

/** 已经存下的旧名字：命中的字换成＊再给别人看；没命中原样返回。 */
export function maskBlockedName(name: string): string {
  const { flat, hits } = nameHits(name);
  return mask(name, flat.at, hits);
}

/** 聊天正文：辱骂、色情、仇恨打码，不拦发送。 */
export function maskChatText(text: string): string {
  const flat = flatten(text);
  return mask(text, flat.at, findAll(flat, CHAT_WORDS));
}
