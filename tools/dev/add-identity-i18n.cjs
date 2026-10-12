//一次性脚本:身份系统(道号/性别/出身)新键追加进三档 locale
//   node tools/dev/add-identity-i18n.cjs
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");

const ZH = {
	"identity.title": "入世·留名",
	"identity.flavor": "山风过耳,你忽然想起自己也是有名有姓的凡人。仙途漫漫,先报个道号,再择此身来路。",
	"identity.name.lbl": "道号",
	"identity.name.reroll": "另起一个",
	"identity.gender.lbl": "性别",
	"identity.gender.m": "男",
	"identity.gender.f": "女",
	"identity.origin.lbl": "出身",
	"identity.origin.farmer.label": "农家子弟",
	"identity.origin.farmer.desc": "灵谷产出 +15%——自幼识得稼穑,最知春种秋收",
	"identity.origin.hunter.label": "猎户之后",
	"identity.origin.hunter.desc": "战力 +8%——山野拳脚,生来一副好根骨",
	"identity.origin.scholar.label": "书香门第",
	"identity.origin.scholar.desc": "修为产出 +10%——悟性天成,一点就透",
	"identity.origin.trader.label": "商贾之后",
	"identity.origin.trader.desc": "矿石产出 +15%——惯会盘算,营生有道",
	"identity.origin.orphan.label": "散修遗孤",
	"identity.origin.orphan.desc": "突破成功率 +5%——命硬,道心早经磨砺",
	"identity.confirm": "拜入仙途",
	"identity.welcome": "「{0}」,{1},今日踏入仙途。",
	"identity.renamed": "道友更名「{0}」,此世出身{1}。",
	"identity.edit": "改命"
};

const EN = {
	"identity.title": "Enter the Path — A Name",
	"identity.flavor": "The mountain wind reminds you that you are still a mortal with a name. Speak your dao name, then choose this life's origin.",
	"identity.name.lbl": "Dao name",
	"identity.name.reroll": "Roll another",
	"identity.gender.lbl": "Gender",
	"identity.gender.m": "Male",
	"identity.gender.f": "Female",
	"identity.origin.lbl": "Origin",
	"identity.origin.farmer.label": "Farmer's Child",
	"identity.origin.farmer.desc": "+15% spirit grain — you know the fields",
	"identity.origin.hunter.label": "Hunter's Kin",
	"identity.origin.hunter.desc": "+8% combat power — mountain-bred bones",
	"identity.origin.scholar.label": "Scholar's House",
	"identity.origin.scholar.desc": "+10% cultivation — born with insight",
	"identity.origin.trader.label": "Merchant's Heir",
	"identity.origin.trader.desc": "+15% minerals — a head for business",
	"identity.origin.orphan.label": "Rogue's Orphan",
	"identity.origin.orphan.desc": "+5% breakthrough odds — hardened early",
	"identity.confirm": "Take the Path",
	"identity.welcome": "\"{0}\" of {1} steps onto the path of cultivation.",
	"identity.renamed": "You are now known as \"{0}\", born of {1}.",
	"identity.edit": "rename"
};

function appendKeys(file, map) {
	const p = path.join(ROOT, file);
	let src = fs.readFileSync(p, "utf8");
	const cur = JSON.parse(src);
	const fresh = {};
	let added = 0;
	for (const k in map) {
		if (!(k in cur)) { fresh[k] = map[k]; added++; }
	}
	if (!added) { console.log(file + ": already up to date"); return; }
	const block = Object.keys(fresh)
		.map(k => "\t" + JSON.stringify(k) + ": " + JSON.stringify(fresh[k]))
		.join(",\n");
	src = src.replace(/}(\s*)$/, "");
	if (!/,\s*$/.test(src)) { src = src.replace(/\s*$/, "") + ",\n"; }
	src += block + "\n}\n";
	fs.writeFileSync(p, src);
	JSON.parse(fs.readFileSync(p, "utf8"));
	console.log(file + ": +" + added + " keys");
}

appendKeys("res/i18n/en.json", EN);
appendKeys("res/i18n/zh.json", ZH);
appendKeys("res/i18n/crowdin/zh.json", ZH);
