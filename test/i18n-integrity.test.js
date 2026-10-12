/* global

    test,
    expect,
    game,
    describe
*/

/*
 * 修仙化回归门卡。固化本轮大扫除发现的全部同型问题:
 *   1) 源码引用的每个 $I("key") 在 zh.json / en.json 中必须有值
 *   2) zh 值必须含汉字(不允许裸英文)
 *   3) workshop/science/space/religion 玩家可见文本不得含现代/科幻词
 *   4) science→workshop 解锁引用不得悬空(删过的项不能再被指)
 *   5) workshop 升级效果键必须有消费端或标注为纯门槛
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const zh = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/zh.json"), "utf8"));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, "res/i18n/en.json"), "utf8"));

const SRC_FILES = ["game.js", "core.js", "i18n.js"].concat(
	fs.readdirSync(path.join(ROOT, "js"))
		.filter(f => f.endsWith(".js") && !/jsx|min/.test(f))
		.map(f => path.join("js", f))
);

function usedKeys() {
	const keys = new Set();
	for (const rel of SRC_FILES) {
		const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
		const re = /\$I\("([^"]+)"/g;
		let m;
		while ((m = re.exec(src))) {
			if (!m[1].includes("{") && !m[1].endsWith(".")) {
				keys.add(m[1]);
			}
		}
	}
	return [...keys];
}

//---------------- 1&2: i18n 完整性 ----------------
describe("i18n completeness", () => {
	test("every literal $I() key resolves in zh and en", () => {
		const missingZh = [];
		const missingEn = [];
		for (const k of usedKeys()) {
			if (!(k in zh)) missingZh.push(k);
			if (!(k in en)) missingEn.push(k);
		}
		expect(missingZh).toEqual([]);
		expect(missingEn).toEqual([]);
	});

	test("player-facing zh values contain Chinese", () => {
		const bare = [];
		// 纯技术串放行:HTML/单位/专有名词(Android/iOS/APP/Wt 等)
		const technical = /<|^[ -~]{1,4}$|Android|iOS|Dropbox|HODL|Wt\b|APP|font|Ctrl|Shift/;
		for (const k of usedKeys()) {
			const v = zh[k];
			if (typeof v !== "string" || !v.trim()) continue;
			if (technical.test(v)) continue;
			if (/^[ -~]+$/.test(v)) bare.push(k + " = " + v);
		}
		expect(bare).toEqual([]);
	});
});

//---------------- 3: 现代词黑名单 ----------------
const FORBIDDEN = /混凝土|电磁炮|光刻机|星链|哈勃|人工智能|纳米|强子|核裂|核聚|核反|钍|铀|钛金|火箭|卫星|地外|量子|胶印|印刷机|抽油机|炼油厂|塑料|芯片|独角兽|喵|kitten|feline|太阳能发电|飞船|宇航|水栽培|星球改造|太阳系|流体切割|轨道工程|轨道阵列|空间站|科研船|罗夏|开罗|卡戎|沙丘星|月球|半人马|纱星|碧池|难得素|猫咪|宠物猫/i;

describe("anachronism blacklist", () => {
	test("no modern/sci-fi wording in player-facing zh", () => {
		const offenders = [];
		for (const [k, v] of Object.entries(zh)) {
			if (!/^workshop\.|^science\.|^space\.|^religion\.|^buildings\.|^challendge\.|^prestige\.|^calendar\.msg/.test(k)) continue;
			if (typeof v === "string" && FORBIDDEN.test(v)) offenders.push(k + " = " + v);
		}
		expect(offenders).toEqual([]);
	});

	test("no source-novel names anywhere in zh", () => {
		// 原著专名黑名单——仙缘剧情已全量原创化,这些人名地名不得再出现
		const NOVEL = /韩立|张铁|墨居仁|墨大夫|神手谷|七玄门|黄枫谷|血色禁地|南宫婉|厉飞雨|掌天瓶|长春功|夺舍大法|大衍|曲魂|噬金虫|啼魂|元瑶|玄骨|虚天|乾蓝|补天|蟹道人|风雷翅|玄天果|青元|掩月宗|乱星海|金雷竹|银月|陈巧倩|太南谷|青竹蜂云|墨蛟|飞灵族|金光上人|野狼谷|九曲灵参|升仙令|落云宗/;
		const offenders = [];
		for (const [k, v] of Object.entries(zh)) {
			if (typeof v === "string" && NOVEL.test(v)) offenders.push(k + " = " + v);
		}
		expect(offenders).toEqual([]);
	});

	test("no Kittens Game originals in zh", () => {
		const ORIGINAL = /猫|喵|kitten|独角兽|利维坦|象牙|反物质|冥币|阴煞|死灵麒麟|圣麒麟|天角兽|黑洞|千禧年|无政府|无神论|黑暗天空|超时空|外层空间|太空灯塔|方尖碑|时间水晶|冷冻仓|蒸汽机|机器人|次元超越|难得素/i;
		const offenders = [];
		for (const [k, v] of Object.entries(zh)) {
			if (typeof v === "string" && ORIGINAL.test(v)) offenders.push(k + " = " + v);
		}
		expect(offenders).toEqual([]);
	});
});

//---------------- 4: 解锁引用完整性 ----------------
describe("unlock integrity", () => {
	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	const workshopNames = () => {
		const names = new Set(game.workshop.upgrades.map(u => u.name));
		for (const z of game.workshop.zebraUpgrades || []) names.add(z.name);
		for (const c of game.workshop.crafts || []) names.add(c.name);
		return names;
	};

	test("science unlocks.upgrades all resolve to workshop entries", () => {
		const have = workshopNames();
		const dangling = [];
		for (const tech of game.science.techs) {
			for (const up of (tech.unlocks && tech.unlocks.upgrades) || []) {
				if (!have.has(up)) dangling.push(tech.name + " -> " + up);
			}
		}
		expect(dangling).toEqual([]);
	});

	test("science unlocks.tech all resolve to science nodes", () => {
		const techNames = new Set(game.science.techs.map(t => t.name));
		const dangling = [];
		for (const tech of game.science.techs) {
			for (const t of (tech.unlocks && tech.unlocks.tech) || []) {
				if (!techNames.has(t)) dangling.push(tech.name + " -> " + t);
			}
		}
		expect(dangling).toEqual([]);
	});

	test("workshop internal unlocks.upgrades chains resolve", () => {
		const have = workshopNames();
		const dangling = [];
		const all = game.workshop.upgrades.concat(game.workshop.zebraUpgrades || []);
		for (const up of all) {
			for (const u of (up.unlocks && up.unlocks.upgrades) || []) {
				if (!have.has(u)) dangling.push(up.name + " -> " + u);
			}
		}
		expect(dangling).toEqual([]);
	});

	test("challenge unlocks.upgrades resolve", () => {
		const have = workshopNames();
		const dangling = [];
		for (const ch of game.challenges.challenges || []) {
			for (const u of (ch.unlocks && ch.unlocks.upgrades) || []) {
				if (!have.has(u)) dangling.push(ch.name + " -> " + u);
			}
		}
		expect(dangling).toEqual([]);
	});
});

//---------------- 5: 死内容回归 ----------------
describe("dead content guard", () => {
	const DELETED = [
		"ironwood", "concreteHuts", "unobtainiumHuts", "eludiumHuts",
		"gmo", "pyrolysis", "unobtainiumDrill", "amFission",
		"hubbleTelescope", "astrophysicists"
	];

	beforeEach(() => {
		global.gamePage = global.game = new com.nuclearunicorn.game.ui.GamePage();
		game.setUI(new classes.ui.UISystem("gameContainerId"));
		game.resetState();
	});

	test("deleted upgrades stay deleted", () => {
		const names = new Set(game.workshop.upgrades.map(u => u.name));
		for (const d of DELETED) expect(names.has(d)).toBe(false);
		for (const tech of game.science.techs) {
			for (const up of (tech.unlocks && tech.unlocks.upgrades) || []) {
				expect(DELETED.includes(up)).toBe(false);
			}
		}
	});

	test("every workshop effect has a consumer or is a gate", () => {
		// 消费端集合:getEffect("X") / effects["X"] 读取点 + 资源名动态后缀
		const consumed = new Set();
		for (const rel of SRC_FILES) {
			const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
			for (const m of src.matchAll(/getEffect\("([^"]+)"\)/g)) consumed.add(m[1]);
			for (const m of src.matchAll(/effects\["([^"]+)"\]/g)) consumed.add(m[1]);
			for (const m of src.matchAll(/getLimitedDR\([^)]*getEffect\("([^"]+)"\)/g)) consumed.add(m[1]);
		}
		// 资源派生名:<res>Ratio / <res>Max / <res>PerTick 等由 resPool 动态消费
		const resNames = new Set(game.resPool.resources.map(r => r.name));
		const resSuffix = /^(PerTick|PerTickBase|PerTickBaseSpace|PerTickProd|PerTickAutoprod|PerTickAutoprodSpace|PerTickSpace|PerTickRatio|PerSec|PerDay|Max|MaxChallenge|MaxRatio|Ratio|RatioMax|SuperRatio|GlobalRatio|CostReduction|ConsumptionAmbassadors|Consumption|PriceRatio|PerTickCon)$/;
		const isResDerived = (name) => {
			for (const r of resNames) {
				if (name.startsWith(r) && resSuffix.test(name.slice(r.length))) return true;
			}
			return false;
		};
		// 门槛/特殊:unlocks/handler/upgrades/stages 字段驱动的项无效果也合法
		const dead = [];
		for (const up of game.workshop.upgrades.concat(game.workshop.zebraUpgrades || [])) {
			const eff = up.effects || {};
			const isGate = !!(up.unlocks || up.handler || up.upgrades);
			for (const k of Object.keys(eff)) {
				if (consumed.has(k) || isResDerived(k)) continue;
				// 注册在 statics 里的效果视为已登记
				const reg = game.effectsMgr && game.effectsMgr.statics && game.effectsMgr.statics.effectMeta;
				if (reg && reg[k]) continue;
				dead.push(up.name + "." + k);
			}
		}
		expect(dead).toEqual([]);
	});
});
