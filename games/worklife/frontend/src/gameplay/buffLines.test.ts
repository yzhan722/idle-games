import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { buffLine, buffParts } from "./buffLines";

describe("增益文字只写会生效的效果", () => {
  it("战斗速度写成折算后的攻击速度；金币写成战斗金币；次级属性用中文名", () => {
    assert.deepEqual(buffParts({ multipliers: { combatSpeed: 1.2 } }), ["攻击速度 +2%"]);
    assert.deepEqual(buffParts({ multipliers: { combatSpeed: 1.8 } }), ["攻击速度 +3%"]);
    assert.equal(buffLine({ multipliers: { combatSpeed: 1.04 }, durationSec: 180 }), "攻击速度 +0.4% · 3 分钟");
    assert.equal(buffLine({ multipliers: { combatSpeed: 1 }, durationSec: 180 }), "");
    assert.equal(
      buffLine({ durationSec: 600, multipliers: { combatSpeed: 1.1, goldGain: 1.2 }, stats: { atk: 4, def: 4, physResist: 4, elemResist: 4 } }),
      "攻击 +4 · 防御 +4 · 物抗 +4 · 元抗 +4 · 攻击速度 +1% · 战斗金币 +20% · 10 分钟",
    );
    assert.deepEqual(buffParts({ multipliers: { gatherSpeed: 2, craftSpeed: 1.25, xpGain: 1.25 }, stats: { efficiency: 5, rareFind: 8 } }), [
      "效率 +5%", "战斗稀有掉落 +8%", "采集速度 +100%", "制作速度 +25%", "经验 +25%",
    ]);
    assert.equal(buffLine(undefined), "");
  });

  it("内容包里没有认不出来的增益字段；描述里写的攻击速度等于真会结算的，不写战斗速度原数", () => {
    const pack = JSON.parse(readFileSync(new URL("../../../shared/enhanced_content_pack_chinese.json", import.meta.url), "utf8"));
    const stats = new Set(["atk", "def", "accuracy", "evasion", "physResist", "elemResist", "efficiency", "rareFind"]);
    const mults = new Set(["gatherSpeed", "craftSpeed", "combatSpeed", "xpGain", "goldGain"]);
    for (const item of pack.items as Array<{ id: string; description?: string; effect?: { buff?: { stats?: object; multipliers?: object } } }>) {
      const buff = item.effect?.buff;
      for (const k of Object.keys(buff?.stats || {})) assert.ok(stats.has(k), `${item.id}: ${k}`);
      for (const k of Object.keys(buff?.multipliers || {})) assert.ok(mults.has(k), `${item.id}: ${k}`);
      assert.doesNotMatch(item.description || "", /战斗速度|攻速|全速度|金币收益/, item.id);
      const said = /攻击速度 \+([\d.]+)%/.exec(item.description || "")?.[1];
      if (said) assert.ok(buffParts(buff as any).includes(`攻击速度 +${said}%`), `${item.id}: ${said}`);
    }
  });
});
