// 昵称 / 播报屏蔽词（ML-COM3）：纯函数，前端 modules/ 和服务端 functions/ 共用这一份规则。词表在 name_filter_words.js，人工可增删。
// 命中：改名时拒绝；显示时打码（旧数据读出来也过一遍）。变体：全角、大小写、空格与符号、零宽字符、西里尔 / 希腊同形字母、数字当字母（adm1n）。
// 拼音首字母、谐音、拆字留给后续。

import { NAME_FILTER_ALLOW, NAME_FILTER_WORDS } from "./name_filter_words.js";

const ZERO_WIDTH = /[­᠎​-‏‪-‮⁠-⁤﻿]/;
const MARKS = /\p{M}/gu;
const WORD_CHAR = /[\p{L}\p{N}]/u;
const LATIN = /[a-z]/;
/** 小写后长得像拉丁字母的西里尔 / 希腊字母，以及「艹」 */
const HOMOGLYPH = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", у: "y", х: "x",
  і: "i", ї: "i", ј: "j", ѕ: "s", ԁ: "d", ӏ: "l", ɡ: "g",
  α: "a", β: "b", ε: "e", ι: "i", κ: "k", ν: "v", ο: "o", ρ: "p", τ: "t", υ: "u", χ: "x", ω: "w",
  艹: "草",
};
/** 数字和符号当字母写 */
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", 8: "b", "@": "a", $: "s", "!": "i", "|": "l" };
const GAP = " ";
const ASTRAL = ""; // 不在任何词里的占位：保证折叠后的一位对应原文一位

function fold(ch) {
  const s = ch.normalize("NFKD").replace(MARKS, "").toLowerCase();
  let out = "";
  for (const c of s) out += HOMOGLYPH[c] ?? c;
  return out;
}

/**
 * 折叠成便于比对的文本，并记下每一位来自原文第几个字符（按码点）。
 * leet：数字符号当字母；gaps：空格符号留一个空位（整词比对用），否则直接去掉。
 */
function view(chars, { leet, gaps }) {
  let text = "";
  const src = [];
  chars.forEach((ch, i) => {
    if (ZERO_WIDTH.test(ch)) return;
    for (let c of fold(ch)) {
      if (leet && LEET[c]) c = LEET[c];
      if (!WORD_CHAR.test(c)) {
        if (gaps && text && text[text.length - 1] !== GAP) {
          text += GAP;
          src.push(i);
        }
        continue;
      }
      text += c.length > 1 ? ASTRAL : c;
      src.push(i);
    }
  });
  return { text, src };
}

function compileWords() {
  const norm = (w) => view([...String(w)], { leet: false, gaps: false }).text;
  const out = [];
  for (const [category, lists] of Object.entries(NAME_FILTER_WORDS)) {
    for (const w of lists.sub || []) if (norm(w)) out.push({ category, word: w, key: norm(w), mode: "sub" });
    for (const w of lists.word || []) if (norm(w)) out.push({ category, word: w, key: norm(w), mode: "word" });
  }
  return out;
}

const WORDS = compileWords();
const ALLOW = (NAME_FILTER_ALLOW || []).map((w) => view([...String(w)], { leet: false, gaps: false }).text).filter(Boolean);
const LETTER = /\p{L}/u;

/** 原文每个字符的类别：w 字 / g 空格符号 / z 零宽 */
function classes(chars, leet) {
  return chars.map((ch) => {
    if (ZERO_WIDTH.test(ch)) return "z";
    for (let c of fold(ch)) {
      if (leet && LEET[c]) c = LEET[c];
      if (WORD_CHAR.test(c)) return "w";
    }
    return "g";
  });
}

/**
 * 去掉空格后才凑出来的英文词，要整段对齐原文的词边界才算：
 * 「s h i t」算，「this hit」里的「s hit」不算。中文词不受这条限制。
 */
function spansWords(cls, from, to) {
  let gap = false;
  for (let k = from + 1; k < to; k += 1) if (cls[k] === "g") gap = true;
  if (!gap) return true;
  let p = from - 1;
  while (p >= 0 && cls[p] === "z") p -= 1;
  let n = to + 1;
  while (n < cls.length && cls[n] === "z") n += 1;
  return !(p >= 0 && cls[p] === "w") && !(n < cls.length && cls[n] === "w");
}

const isLatinKey = (key) => /^[a-z0-9]+$/.test(key);

/** 所有命中：[{ category, word, from, to }]，from / to 是原文码点下标（含两端） */
function findHits(input) {
  const chars = [...String(input ?? "")];
  if (!chars.length) return { chars, hits: [] };
  const views = [false, true].flatMap((leet) => {
    const cls = classes(chars, leet);
    return [
      { ...view(chars, { leet, gaps: false }), cls, compact: true, leet },
      { ...view(chars, { leet, gaps: true }), cls, compact: false, leet },
    ];
  });
  // 放行词在原文里占的位置（去掉空格、不过数字当字母的那份）
  const plain = views[0];
  const allowed = [];
  for (const key of ALLOW) {
    for (let at = plain.text.indexOf(key); at >= 0; at = plain.text.indexOf(key, at + 1)) allowed.push([plain.src[at], plain.src[at + key.length - 1]]);
  }
  const hits = [];
  for (const w of WORDS) {
    const latin = isLatinKey(w.key);
    for (const v of views) {
      // 中文词只在去掉空格的视图里找；英文词两种都找
      if (!v.compact && (w.mode === "sub") && !latin) continue;
      for (let at = v.text.indexOf(w.key); at >= 0; at = v.text.indexOf(w.key, at + 1)) {
        if (w.mode === "word") {
          const before = v.text[at - 1];
          const after = v.text[at + w.key.length];
          if ((before && LATIN.test(before)) || (after && LATIN.test(after))) continue;
        }
        const from = v.src[at];
        const to = v.src[at + w.key.length - 1];
        if (v.compact && latin && !spansWords(v.cls, from, to)) continue;
        // 数字当字母只在夹着真字母时算：「a55」「5h1t」算，「第 455 关」「Lv.455」不算
        if (v.leet && !chars.slice(from, to + 1).some((ch) => LETTER.test(fold(ch)))) continue;
        if (allowed.some(([a, b]) => a <= from && to <= b)) continue;
        hits.push({ category: w.category, word: w.word, from, to });
      }
    }
  }
  return { chars, hits };
}

/** 改名 / 注册时用：{ ok, hits: [{ category, word }] } */
export function checkName(input) {
  const { hits } = findHits(input);
  const seen = new Set();
  const list = [];
  for (const h of hits) {
    const k = `${h.category}|${h.word}`;
    if (seen.has(k)) continue;
    seen.add(k);
    list.push({ category: h.category, word: h.word });
  }
  return { ok: list.length === 0, hits: list };
}

/** 显示时用：命中的那几个字（连同中间的空格符号）换成 *，其余原样 */
export function maskText(input) {
  const { chars, hits } = findHits(input);
  if (!hits.length) return String(input ?? "");
  const masked = chars.slice();
  for (const h of hits) for (let i = h.from; i <= h.to; i += 1) masked[i] = "*";
  return masked.join("");
}

/** 昵称显示：去首尾空格、最长 32、打码；打完只剩星号或是空的，用默认名 */
export function displayName(input, fallback = "育灵师") {
  const s = String(input ?? "").trim().slice(0, 32);
  const masked = maskText(s);
  return /[^*\s]/.test(masked) ? masked : fallback;
}
