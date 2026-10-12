// 去原作化最终清理:词汇统一 + 挑战文案对齐现实
const fs = require('fs');
const M = {
	// ===== 象牙 → 灵骨(资源已叫灵骨) =====
	'effectsMgr.statics.ivoryMeteorChance.title': '灵骨陨星概率',
	'effectsMgr.statics.ivoryMeteorRatio.title': '灵骨陨星加成',
	'prestige.unicornmancy.desc': '麒麟裂隙与灵骨陨星发生得更频繁',
	'religion.zu.ivoryCitadel.label': '灵骨堡',
	'religion.zu.ivoryCitadel.desc': '麒麟产量 +25%,召唤灵骨陨星',
	'religion.zu.ivoryTower.label': '灵骨塔',
	'religion.zu.ivoryTower.desc': '麒麟产量 +10%,解锁麒麟裂隙',
	'effectsMgr.statics.zigguratIvoryPriceRatio.title': '灵骨价格比率',
	'buildings.ivoryTemple.label': '灵骨神殿',
	'buildings.ivoryTemple.desc': '将灵骨炼为灵石的神秘神殿',
	'challendge.unicornTears.effect.desc': '麒麟冢提升香火上限(随超脱阶数成长),并降低祭坛的灵骨价格比率。',

	// ===== 利维坦 → 古神 =====
	'effectsMgr.statics.compendiaTTBoostRatio.title': '古神法典加成',
	'prestige.codexLeviathanianus.label': '古神法典',
	'prestige.codexLeviathanianus.desc': '每一超脱等级使功法典籍的感悟加成上限提升 5%',
	'religion.tu.blackLibrary.desc': '每级玄书阁使古神法典效能提升 2%,此加成可被麒麟墓园进一步增益',
	'badges.buffet.desc': '古神之力蓄满一千。',

	// ===== 黑洞 → 归墟 =====
	'space.planet.umbra.hrHarvester.desc': '归墟辐射收割机——汲取归墟蒸腾之力。每级产出 1W 能源,随时间缓增',
	'space.umbraMission.desc': '归墟是悬于玄黄星域中心的太初之眼',

	// ===== 圣麒麟/天角兽/麟角 → 天麟(生物统一名) =====
	'resources.alicorn.title': '天麟',
	'calendar.msg.alicorn': '一头天麟自九天降临!',
	'console.filter.alicornRift': '天麟裂隙',
	'console.filter.alicornSacrifice': '天麟献祭',
	'console.filter.alicornCorruption': '天麟魔染',
	'effectsMgr.statics.alicornChance.title': '天麟降临概率',
	'religion.sacrificeAlicornsBtn.label': '献祭天麟',
	'religion.sacrificeAlicornsBtn.desc': '将天麟放逐至血月,换得一枚光阴晶',
	'religion.sacrificeAlicornsBtn.sacrifice.msg': '{0} 头天麟被放逐,你获得了 {1} 枚光阴晶!',
	'prestige.alicornmancy.label': '天麟感召',
	'prestige.alicornmancy.desc': '提升历练中获得天麟的几率。\n解锁后天麟即刻开始产出。',
	'workshop.alicornStable.label': '天麟栏',
	'workshop.alicornStable.desc': '筑栏蓄麟——(挑战)天麟上限提升',

	// ===== 资源标题统一 =====
	'resources.necrocorn.title': '魔麒角',
	'resources.blackcoin.title': '玄晶币',
	'ui.loading.msg.14': '正在铸造玄晶币',
	'resources.sorrow.title': '玄泪',
	'resources.sorrow.full': '玄泪之气',
	'resources.sorrow.short': '玄泪',

	// ===== 煤 → 玄炭 =====
	'effectsMgr.statics.coalRatioGlobal.title': '玄炭产量惩罚',
	'effectsMgr.statics.coalRatioGlobalReduction.title': '玄炭产量惩罚降低',
	'effectsMgr.statics.cryostation-coalMax.title': '冰眠站 - 玄炭上限',
	'effectsMgr.statics.harborCoalRatio.title': '港口玄炭储量扩容',
	'science.combustion.label': '燃灵诀',
	'science.combustion.desc': '燃灵之学提供了改进机关枢等以玄炭驱动的古法机括之术',

	// ===== 铁/矿物/木材 → 玄铁/灵石/灵木 =====
	'effectsMgr.statics.calcinerSteelCraftRatio.title': '钢坊对煅金炉加成',
	'effectsMgr.statics.cryostation-ironMax.title': '冰眠站 - 玄铁上限',
	'effectsMgr.statics.cryostation-mineralsMax.title': '冰眠站 - 灵石上限',
	'effectsMgr.statics.cryostation-woodMax.title': '冰眠站 - 灵木上限',
	'science.metal.label': '锻金术',
	'ui.option.iw.smelter': '苦修模式下,玄铁储量不足 95% 时关闭炼器炉',
	'buildings.smelter.flavor': '炉火纯青,方得玄铁',

	// ===== 其他不一致 =====
	'effectsMgr.statics.antimatterProduction.title': '湮灭精元产出',
	'achievements.jupiterAscending.desc': '开宗一年之内即成星槎破空。',
	'space.planet.charon.entangler.desc': '纠缠阵为太微神机生成纠缠灵尘。需大量算力,但可助修界攻破上古神的封禁',
	'workshop.combustionEngine.flavor': '机关亦有道。',
	'challendge.btn.chronosphere.desc': '你将不能获得轮回殿的重置效果',
	'challendge.btn.chronosphere.with.ironWill.desc': '你将不能获得轮回殿的重置效果。<br />警告:轮回殿的重置效果将自动关闭苦修模式。',
	'religion.tu.darkNova.label': '玄殒星',
	'religion.ru.transcendence.label': '超脱',
	'religion.ru.transcendence.desc': '解锁额外的神职升级',
	'religion.transcendBtn.label': '超脱',
	'religion.transcendBtn.desc': '超脱凡俗之极限',
	'religion.transcend.confirmation.title': '要进行超脱吗?',
	'religion.transcend.confirmation.msg': '确定要舍弃部分顿悟吗?\n\n牺牲一部分顿悟可提升至新的超脱等级。\n\n每个超脱等级都将提升香火转化为虔诚的效率。\n\n每次提升超脱等级都需要牺牲更多的顿悟。\n\n此加成可以累积并在转世时保留。',
	'religion.transcend.msg.success': '道行超脱凡俗之极限。达到超脱等级: {0}',
	'gift.transcendence': '超脱等级增加 4!',

	// ===== 挑战文案对齐现实 =====
	'challendge.1000Years.label': '千载之劫',
	'challendge.1000Years.desc': '重启轮回,光阴折半流淌<br><br>目标: 抵达第 1000 年',
	'challendge.1000Years.effect.desc': '光阴晶燃烧释放的热量减少',
	'challendge.anarchy.label': '无宗独修',
	'challendge.anarchy.desc': '无宗无派,独身求证大道。<br><br>目标:建造器灵核心',
	'challendge.atheism.label': '绝神弃祀',
	'challendge.atheism.desc': '重启轮回,没有香火加成。<br /><br />目标: 携至少一座冰眠舱转世',
	'challendge.atheism.effect.desc': '每一超脱等级将香火加成的上限提升 100% (相当于 20 级玄碑)',
	'challendge.blackSky.label': '天晦',
	'challendge.blackSky.desc': '重启轮回,没有天象异星。<br><br>目标: 建造一座引星灯',
	'challendge.blackSky.event': '苍穹晦暝,群星隐没',
	'challendge.energy.label': '灵机之劫',
	'challendge.energy.desc': '重启轮回,灵机消耗变为 2 倍。<br /><br />目标: 解锁所有灵机生产建筑,并至少各建一级',
	'challendge.energy.effect.desc': '灵机短缺的生产惩罚减半',
	'challendge.pacifism.desc': '止戈为武,不兴杀伐。<br><br>目标:不遣历练、通商累功后转世',
	'challendge.postApocalypse.effect.desc': '提升可运行的冰眠舱数量。',
	'challendge.ironWill.label': '苦修',
};
for (const p of ['res/i18n/zh.json', 'res/i18n/crowdin/zh.json']) {
	const j = JSON.parse(fs.readFileSync(p, 'utf8'));
	let c = 0;
	for (const [k, v] of Object.entries(M)) { if (j[k] !== v) { j[k] = v; c++; } }
	fs.writeFileSync(p, JSON.stringify(j, null, '\t') + '\n');
	console.log(p, 'changed:', c);
}
