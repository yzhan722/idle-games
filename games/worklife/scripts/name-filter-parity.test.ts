import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import * as back from "../backend/src/name_filter";
import * as front from "../frontend/src/gameplay/nameFilter";
import { REPORT_REASONS } from "../backend/src/chat_moderation";
import { REPORT_REASON_LABELS } from "../frontend/src/gameplay/chatReport";
import words from "../shared/blocked_words.json";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const SAMPLES = [
  "傻逼", "傻 逼王", "ＦＵＣＫ you", "f.u.c.k", "sh1t", "admin01", "GM_Tom", "官方客服", "系统小助手", "小王客服", "希特勒",
  "小明", "badminton", "Classic", "侠客服饰", "Grape", "Peacock", "Assassin", "官方活动几点开始", "", "玩家_3fa9c1", "🐱喵",
  "第455关", "Lv.455", "战力 2455", "a55hole", "5hit", "finish it", "fu ck you", "叫做爱丽丝", "路口交通", "出口交易", "支援交流", "属性交换",
];

describe("屏蔽词：前后端同源", () => {
  it("两份逻辑除了引入词表那一行逐字相同，都从 shared/blocked_words.json 读词表", () => {
    const strip = (s: string) => s.replace(/^import WORDS from ".*blocked_words\.json";$/m, "");
    const b = read("../backend/src/name_filter.ts");
    const f = read("../frontend/src/gameplay/nameFilter.ts");
    assert.ok(b.includes('import WORDS from "../../shared/blocked_words.json";'));
    assert.ok(f.includes('import WORDS from "../../../shared/blocked_words.json";'));
    assert.equal(strip(f), strip(b));
  });

  it("同一批名字与句子，两边结果一样", () => {
    for (const s of SAMPLES) {
      assert.equal(front.isBlockedName(s), back.isBlockedName(s), s);
      assert.equal(front.maskBlockedName(s), back.maskBlockedName(s), s);
      assert.equal(front.maskChatText(s), back.maskChatText(s), s);
    }
  });

  it("词表小而成形：每类都有中英文，注明人工可增删；没有两字以下的英文词", () => {
    const w = words as Record<string, unknown>;
    assert.ok(String(w["说明"]).includes("人工可增删"));
    for (const k of ["abuse", "sexual", "hate", "impersonation"]) {
      const list = w[k] as string[];
      assert.ok(list.some((x) => /[一-鿿]/.test(x)) && list.some((x) => /^[a-z]+$/.test(x)), k);
      assert.ok(list.length <= 40, `${k} 太长了，宁少勿滥`);
      for (const x of list) if (/^[a-z]+$/.test(x)) assert.ok(x.length >= 4, `${x} 太短，容易误伤`);
    }
  });

  it("防误伤：数字只在夹在英文字母之间时当字母；正常词里夹着的屏蔽词放行；英文跨空格要从词头到词尾", () => {
    for (const ok of ["第455关", "Lv.455", "战力 2455", "关卡455通过", "finish it", "push it", "who really", "this hit", "叫做爱丽丝", "路口交通", "出口交易", "支援交流", "属性交换", "给你做爱吃的", "今天生日你妈妈来吗", "这支那么强"]) {
      assert.equal(back.maskChatText(ok), ok, ok);
    }
    for (const bad of ["sh1t", "a55hole", "f4gg0t", "fu ck you", "f u c k", "傻 逼王", "做爱", "口交", "援交", "bullshit"]) {
      assert.notEqual(back.maskChatText(bad), bad, bad);
    }
    assert.equal(back.maskChatText("fu ck you"), "＊＊＊＊＊ you");
    assert.equal(back.isBlockedName("叫做爱丽丝"), false);
    assert.equal(back.isBlockedName("属性交易所"), false);
    assert.ok((words as Record<string, unknown>).allow instanceof Array);
  });

  it("举报原因：前端按钮与后端接受的原因一一对应", () => {
    assert.deepEqual(Object.keys(REPORT_REASON_LABELS), [...REPORT_REASONS]);
  });
});
