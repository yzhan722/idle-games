//补齐战力系统改动暴露的 i18n 缺口:
// 1) zh.json 漏掉的 2 条伏击文案(crowdin/en 已有)
// 2) 8 个法宝的 label/desc —— 自法宝系统实装起三语全缺(label 一直渲染成 $key$)
var fs = require("fs");
var ZH = {
	"cultivation.msg.rift.ambush": "秘境妖兽伏击!且战且退,心魔滋生。",
	"cultivation.rift.result.ambush": "妖兽伏击,且战且退,心魔暗生。",
	"cultivation.artifact.xuantie.label": "玄铁重剑",
	"cultivation.artifact.xuantie.desc": "秘境凶兽脊骨淬玄铁而成,重若千钧,挥动间灵压自生。执之修行,修为增进 +8%。",
	"cultivation.artifact.juling.label": "聚灵佩",
	"cultivation.artifact.juling.desc": "古修随身玉佩,可纳四方游离灵气聚于身侧。修为增进 +5%。",
	"cultivation.artifact.fengchi.label": "风雷翅",
	"cultivation.artifact.fengchi.desc": "雷鹏遗羽所炼,振翼千里。佩之寻宝,灵石矿脉 +3/息。",
	"cultivation.artifact.yanghun.label": "养魂木",
	"cultivation.artifact.yanghun.desc": "万年阴沉神木,蕴养神魂、宁心静虑。古宝涓滴,且心魔渐消。",
	"cultivation.artifact.qiankun.label": "乾坤扇",
	"cultivation.artifact.qiankun.desc": "扇面绘山河,一挥灵潮倒卷。诸般产出 +6%,修为 +5%。",
	"cultivation.artifact.pangu.label": "盘古残片",
	"cultivation.artifact.pangu.desc": "开天遗珍碎屑,其上道纹犹存。参悟可得修为 +12%,产出 +6%。",
	"cultivation.artifact.xuding.label": "虚天鼎",
	"cultivation.artifact.xuding.desc": "虚天殿镇殿遗宝,乾蓝冰焰温养万载。修为 +9%,古宝涓滴。",
	"cultivation.artifact.yuanci.label": "元磁神山",
	"cultivation.artifact.yuanci.desc": "元磁神光凝成的寸许山岳,五行辟易、万宝俯首。产出 +7%,修为 +8%。"
};
var EN = {
	"cultivation.artifact.xuantie.label": "Black-Iron Greatsword",
	"cultivation.artifact.xuantie.desc": "Forged from a rift-beast's spine and black iron. Spirit pressure radiates with every swing. Cultivation gain +8%.",
	"cultivation.artifact.juling.label": "Spirit-Gathering Jade",
	"cultivation.artifact.juling.desc": "A cultivator's pendant that draws loose ambient qi to its bearer. Cultivation gain +5%.",
	"cultivation.artifact.fengchi.label": "Wind-Thunder Pinions",
	"cultivation.artifact.fengchi.desc": "Refined from a thunderroc's feathers — one beat crosses a thousand li. Minerals +3/tick.",
	"cultivation.artifact.yanghun.label": "Soul-Nurturing Wood",
	"cultivation.artifact.yanghun.desc": "Ten-thousand-year spiritwood that nourishes the soul and stills the mind. Relic trickle; heart demons slowly recede.",
	"cultivation.artifact.qiankun.label": "Qiankun Fan",
	"cultivation.artifact.qiankun.desc": "Mountains and rivers painted on its face; one wave reverses the spiritual tide. All production +6%, cultivation +5%.",
	"cultivation.artifact.pangu.label": "Pangu Shard",
	"cultivation.artifact.pangu.desc": "A fragment of a world-opening treasure, dao-patterns intact. Cultivation +12%, production +6%.",
	"cultivation.artifact.xuding.label": "Void Heaven Cauldron",
	"cultivation.artifact.xuding.desc": "The Void Heaven Palace's founding treasure, tempered by azure ice-flame. Cultivation +9%, relic trickle.",
	"cultivation.artifact.yuanci.label": "Yuan-ci Divine Mountain",
	"cultivation.artifact.yuanci.desc": "A thumb-sized peak condensed of yuan-ci divine light — the five elements bow before it. Production +7%, cultivation +8%."
};
function patch(path, dict){
	var j = JSON.parse(fs.readFileSync(path, "utf8"));
	var added = 0;
	for (var k in dict){ if (!j[k]){ j[k] = dict[k]; added++; } else if (j[k] !== dict[k]){ j[k] = dict[k]; added++; } }
	fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
	console.log(path, "+", added);
}
patch("res/i18n/zh.json", ZH);
patch("res/i18n/crowdin/zh.json", Object.assign({}, ZH)); //zh.json 缺的 2 条 crowdin 已有,补丁是幂等的
patch("res/i18n/en.json", EN);
