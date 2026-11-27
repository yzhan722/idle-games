import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import packJson from "../../shared/enhanced_content_pack_chinese.json";
import type { EnhancedContentPack } from "./types";
import { setBonusText } from "./set_bonus";
import { rareFindText } from "./rare_find";
import { GUILD_BOUNTY_AFFIXES } from "./progression2";
import { createMemoryStorage } from "./storage_memory";

const pack = packJson as unknown as EnhancedContentPack;

/** 界面上写的加成要和服务端结算一致（WL-G2）。这里守住「写了但不生效」的几类不再回来。 */
function sources(dir: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.tsx?$/.test(name) && !name.includes(".test.")) out.push([full, fs.readFileSync(full, "utf8")]);
  }
  return out;
}
const backend = sources(__dirname);
const frontend = sources(path.resolve(__dirname, "../../frontend/src"));
/** 去掉注释，只看代码与文案。 */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");
const mentions = (files: Array<[string, string]>, re: RegExp) => files.filter(([, text]) => re.test(code(text))).map(([file]) => path.basename(file));

describe("界面文字与服务端一致", () => {
  it("战斗速度只按折算后的「攻击速度」写；声望、称号、相框、词缀上的战斗速度仍没有结算读取，不写", () => {
    const combat = backend.find(([f]) => path.basename(f) === "first_hour_combat.ts")![1];
    assert.match(combat, /attackSpeedInterval\(/, "攻击速度进了战斗结算");
    assert.deepEqual(mentions([...backend, ...frontend], /战斗速度|攻速 \+|讨伐速度/), []);
    for (const [file, text] of frontend) {
      if (path.basename(file) === "buffLines.ts") continue;
      assert.doesNotMatch(code(text), /攻击速度 ?\+/, `${path.basename(file)}：攻击速度的数字只能由 attackSpeedPct 算出来`);
    }
  });

  it("稀有发现的三个来源写多少就加多少", () => {
    for (const affix of GUILD_BOUNTY_AFFIXES) {
      for (const [text, mods] of [[affix.activeEffectText, affix.activeModifiers], [affix.lingeringEffectText, affix.lingeringModifiers]] as const) {
        const said = /战斗稀有掉率 \+(\d+)%/.exec(text)?.[1];
        const pct = (mods as { rareFindPct?: number }).rareFindPct ?? 0;
        assert.equal(Number(said || 0), pct, affix.id);
        if (pct) assert.ok(text.includes(`战斗稀有掉率 ${rareFindText(pct)}`), `${affix.id}：${text}`);
      }
    }
  });

  it("非战斗动作不产金币、没有不足 100% 的产出：金币加成只写战斗金币，稀有发现不写采集", () => {
    const actions = (pack.actions as Array<{ id: string; yields?: Array<{ itemId: string; chance?: number }> }>).filter((a) => !a.id.startsWith("act_combat_"));
    for (const a of actions) {
      for (const y of a.yields || []) {
        assert.notEqual(y.itemId, "gold", a.id);
        assert.ok((y.chance ?? 1) >= 1, a.id);
      }
    }
    assert.deepEqual(mentions([...backend, ...frontend], /全局金币|生产金币|生产与战斗金币|金币收益 \+|采集伴生/), []);
  });

  it("单人战斗没有随机暴击：暴击类文案都写明组队", () => {
    const hp = backend.find(([f]) => path.basename(f) === "hp_combat.ts")![1];
    assert.doesNotMatch(hp, /crit[A-Za-z]*\s*&&\s*rng|rng\(\)\s*<\s*[^;]*crit/i);
    for (const [file, text] of frontend) {
      if (/PartyPanel|partyRaidData|combatSheet/.test(file)) continue;
      for (const line of code(text).split("\n")) {
        if (!/critRateBonusPct|critDmgBonusPct/.test(line) || !/[一-龥]/.test(line)) continue;
        assert.match(line, /组队暴击/, `${path.basename(file)}: ${line.trim()}`);
      }
    }
    assert.deepEqual(mentions(frontend, /label="暴击/), []);
  });

  it("组队战的暴击、闪避是本机演出，不写进战斗记录", () => {
    const panel = frontend.find(([f]) => path.basename(f) === "PartyPanel.tsx")![1];
    for (const line of panel.split("\n")) {
      if (line.includes("appendBattleLog(")) assert.doesNotMatch(line, /暴击|闪避|技能经验）/, line.trim());
    }
  });

  it("套装每一档的说明都等于真会结算的属性", () => {
    for (const set of pack.equipmentSets as Array<{ id: string; bonuses: Array<{ requiredPieces: number; description: string; stats: Record<string, number> }> }>) {
      for (const bonus of set.bonuses) assert.equal(bonus.description, setBonusText(bonus), set.id);
    }
  });

  it("市场不收税：卖方拿全款，界面也不写手续费", async () => {
    const storage = createMemoryStorage();
    try {
      const mk = async (key: string) => {
        const user = await storage.findOrCreateGuestUser(`tax-${key}`);
        const state = await storage.getOrCreatePlayerState(user.id, pack.version);
        state.inventory.gold = 1000;
        state.inventory.wood_1 = 10;
        return { id: user.id, state };
      };
      const seller = await mk("seller");
      const buyer = await mk("buyer");
      const order = await storage.createTradingOrder({ userId: seller.id, itemId: "wood_1", quantity: 4, price: 25, type: "sell" });
      await storage.executeTrade({ buyerId: buyer.id, orderId: order.id, quantity: 4 });
      assert.equal(seller.state.inventory.gold, 1100);
      assert.equal(buyer.state.inventory.gold, 900);
    } finally {
      await storage.close();
    }
    assert.deepEqual(mentions(frontend, /手续费|卖方 5% 税/), []);
  });

  it("定纹镜失败降 1 级，不写「免于降级」；没有离线结算，不写离线继续", () => {
    assert.deepEqual(mentions([...backend, ...frontend], /免于降级/), []);
    assert.deepEqual(mentions(frontend, /离线也(会)?继续|离线收益/), []);
  });
});
