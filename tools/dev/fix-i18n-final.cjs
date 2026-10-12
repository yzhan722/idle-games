// 补齐最后一波真缺键(crowdin 也无的):cr=权威中文层,zh=镜像,en 缺的补 en
const fs = require("fs");
const CR = "res/i18n/crowdin/zh.json", ZH = "res/i18n/zh.json", EN = "res/i18n/en.json";

const zhAdd = {
	"buildings.accelerator.desc2": "即使停止供能,储藏加成依旧生效。",
	"ui.filter.ironWill": "苦修",
	"common.upgrade.available": "<div class=\"upgrade-available\">(^)</div>",
	"buildings.upgrade.desc.available": "可升级为{0}",
	"buildings.deltagrade.refund.msg": "现有的将尽数售出,返还{0}。",
	"prestige.toggleResearched.label": "隐藏已参悟的玄学",
	"preview.loading": "预览读取中……",
	"preview.banner.badge": "存档预览",
	"preview.banner.exit": "返回修行 →",
	"religion.ru.scholasticism.flavor": "一卷论道的经籍",
	"religion.tu.mausoleum.flavor": "比信仰本身更古老的沉寂。",
	"science.particlePhysics.flavor": "微末之尘,亦藏大道。",
	"science.paradoxalKnowledge.flavor": "为求趣与利,打翻前辈桌上的茶盏也无妨。",
	"policy.sharkRelationsScribes.desc": "鲨族文吏将每支商队的往来记录在案。<br>贸易收益 +5%",
	"workshop.freightfulExchange.label": "漕运互通",
	"workshop.freightfulExchange.desc": "太空港傀儡可代行大宗贸易,每次贸易量 +50%",
	"workshop.zebraUpgrade.zebraTrappers.label": "陷兽阱",
	"workshop.zebraUpgrade.zebraTrappers.desc": "斑灵马设下陷阱,为狩猎备得更周全",
	"workshop.zebraUpgrade.reforgedOutposts.label": "重铸哨站",
	"workshop.zebraUpgrade.reforgedOutposts.desc": "斑灵锻造坊可用来改造哨站,每10座锻坊提供额外筹备。",
	"workshop.zebraUpgrade.rangefinders.label": "测距仪",
	"workshop.zebraUpgrade.rangefinders.desc": "为寻血魄石而锻造的测距仪——锻坊提升狩猎中发现血魄石的几率。",
	"console.filter.explore": "探索",
	"btn.sell.tooltip": "出售以返还 {0} 造价",
	"btn.sell.res.not.refundable": "({0} 不可返还)",
	"btn.almostlimited.tooltip": "* - 升级会降低专政加成",
	"ui.kgnet.error.auth": "会话已过期,请重新登录",
	"ui.kgnet.error.status": "服务器错误 {0}",
	"ui.kgnet.error.network": "无法连接服务器",
	"ui.kgnet.error.nodata": "服务器未返回存档数据",
	"save.import.fail": "读取云端存档失败:{0}。",
	"effectsMgr.statics.biolabBiofuelScienceMaxRatio.title": "生物室燃油感悟上限",
	"effectsMgr.statics.preparationRatio.title": "筹备比",
	"effectsMgr.statics.missingZebraPreparations.title": "缺失的斑灵马筹备"
};
const enAdd = {
	"religion.tu.mausoleum.flavor": "A silence older than faith itself."
};

let added = 0;
for (const file of [CR, ZH]) {
	const j = JSON.parse(fs.readFileSync(file, "utf8"));
	for (const [k, v] of Object.entries(zhAdd)) {
		if (j[k] === undefined) { j[k] = v; added++; }
	}
	fs.writeFileSync(file, JSON.stringify(j, null, "\t") + "\n");
}
const en = JSON.parse(fs.readFileSync(EN, "utf8"));
for (const [k, v] of Object.entries(enAdd)) {
	if (en[k] === undefined) { en[k] = v; added++; }
}
fs.writeFileSync(EN, JSON.stringify(en, null, "\t") + "\n");
console.log("新增键:", added);
