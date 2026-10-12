//一次性脚本:把新手引导/帮助文档的新键追加进 en.json + zh.json + crowdin/zh.json
//   node tools/dev/add-help-i18n.cjs
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");

const ZH = {
	"menu.help": "帮助",
	"console.intro.sub": "不知从何下手?看「道途指引」的下一步,或点上方「帮助」翻阅《修行指南》。",
	"cultivation.guide.gather": "点「采集灵谷」攒下第一把灵谷——万法之源,皆由此始",
	"cultivation.guide.refine": "「凝练灵木」把 100 灵谷炼成 1 灵木——攒两根,备筑茅庐",
	"cultivation.guide.help": "《修行指南》",
	"help.title": "修行指南",
	"help.intro": "「道途指引」会一步步领你开荒;此典详述各系统机理,卡关时随手翻阅。",
	"help.s.start.t": "一、初入山门(前 10 分钟)",
	"help.s.start.b1": "点「采集灵谷」攒灵谷——万法之源,营造、凝木皆靠它。",
	"help.s.start.b2": "有 10 灵谷先建「灵田」:灵谷自此涓涓自生,不必再一下下点。",
	"help.s.start.b3": "「凝练灵木」把 100 灵谷炼成 1 灵木;攒 2 根灵木,建起「茅庐」。",
	"help.s.start.b4": "茅庐是静室,自产「修为」;修为攒够就切到「境界」页点「突破」。",
	"help.s.start.b5": "炼气二层既成,指引会领你去游历、闭关、闯秘境——跟着走即可。",
	"help.s.realm.t": "二、修为与突破",
	"help.s.realm.b1": "境界分九重:炼气、筑基、金丹、元婴、化神、炼虚、合体、大乘、渡劫——重重登天。",
	"help.s.realm.b2": "每层突破耗修为;炼气之后突破有失败之险,失败不坠境界,只蚀道心。",
	"help.s.realm.b3": "灵根天定:单灵根修行快,杂灵根破境贵;转世重来会再 roll。",
	"help.s.realm.b4": "修为来路:静室底流、游历机缘、秘境斩获、丹药增幅、闭关加成。",
	"help.s.realm.b5": "每升一境,灵石产出与战力齐涨——境界即道行,道行即一切。",
	"help.s.action.t": "三、历练四事(共用调息)",
	"help.s.action.b1": "外出游历:随机机缘——灵石灵草、仙缘剧情,偶有劫修伏击;反杀有缴获。",
	"help.s.action.b2": "闭关潜修:修为产出 +60%、世俗产出 -15%,冲刺破境前开一阵。",
	"help.s.action.b3": "秘境历练:保底大额修为,三成概率掉「秘境之钥」。",
	"help.s.action.b4": "上古秘境:耗一把钥匙闯一层天梯;层数越深,修为越厚,法宝掉率越高。",
	"help.s.action.b5": "四事共用一条调息气脉——动一次都要静养,急不得。",
	"help.s.power.t": "四、战力与法宝",
	"help.s.power.b1": "战力来自境界与法宝——秘境深处的劫修,先掂量自己几斤几两。",
	"help.s.power.b2": "法宝只在上古秘境掉落;重复入手自动升阶,满阶炼成「古宝」。",
	"help.s.power.b3": "战力不足强闯高层会落败——不损性命,只是白搭一把钥匙。",
	"help.s.eco.t": "五、洞府经营",
	"help.s.eco.b1": "灵谷→灵木→建筑:营造页诸建筑是灵石与修为的根基。",
	"help.s.eco.b2": "灵脉(筑基解锁):修为的长期乘区,灵石富余就买,早买早赚。",
	"help.s.eco.b3": "宗门(筑基解锁):境界到了就「晋升」,修炼增幅极大。",
	"help.s.eco.b4": "丹药:清心丹洗心魔,筑基丹添破境把握,聚气散提一时修行。",
	"help.s.fate.t": "六、仙缘与命途",
	"help.s.fate.b1": "游历途中偶逢「仙缘」抉择——一念之差,各有机缘,皆入仙途纪事。",
	"help.s.fate.b2": "有的抉择牵出长线剧情,有的只赠一瞬助益;随心选,无绝对对错。",
	"help.s.life.t": "七、寿元与转世",
	"help.s.life.b1": "寿元随境界而增;岁月流逝,寿元耗尽便坐化。",
	"help.s.life.b2": "坐化即转世:此生修为尽散,按境界留下「业力」,福泽来世。",
	"help.s.life.b3": "转世重 roll 灵根;业力可在轮回界面换永久增益。",
	"help.s.cloud.t": "八、存档与云端",
	"help.s.cloud.b1": "本地每 30 秒自动存档;「选项」里可导出/导入存档文本。",
	"help.s.cloud.b2": "登录后可云端存档,还能生成分享预览页给同道观礼。",
	"help.s.cloud.b3": "「江湖榜」自愿上传境界战绩,与四海修士一较高下。",
	"help.s.faq.t": "九、常见问题",
	"help.s.faq.b1": "按钮是灰的?看材料栏——红字就是缺的;或在调息静养中。",
	"help.s.faq.b2": "突破失败?心魔会涨,压住下次的把握;等它消,或服清心丹再来。",
	"help.s.faq.b3": "不知该干嘛?看「道途指引」——多半是该突破,或该去秘境了。",
	"help.s.faq.b4": "关掉页面进度还在吗?在。本地自动存档,重开接着修。"
};

const EN = {
	"menu.help": "Help",
	"console.intro.sub": "Lost? Check the next step in Path Guidance, or open Help above for the cultivation manual.",
	"cultivation.guide.gather": "Click 'Gather Spirit Grain' — everything starts with this herb",
	"cultivation.guide.refine": "Refine spirit wood: 100 grain → 1 wood; stockpile 2 for a hut",
	"cultivation.guide.help": "Manual",
	"help.title": "Cultivation Manual",
	"help.intro": "Path Guidance walks you through the opening. This manual explains each system — consult it whenever you stall.",
	"help.s.start.t": "I. First steps (the first 10 minutes)",
	"help.s.start.b1": "Click 'Gather Spirit Grain' — it fuels building and wood refinement.",
	"help.s.start.b2": "At 10 grain, build a Spirit Field: grain then trickles in on its own.",
	"help.s.start.b3": "'Refine Spirit Wood' turns 100 grain into 1 wood; with 2 wood, raise a Thatched Hut.",
	"help.s.start.b4": "The hut is a quiet cell that yields cultivation; when you have enough, open the Realm tab and Breakthrough.",
	"help.s.start.b5": "At Qi Refining II the guide leads you onward — wander, seclude, run rifts.",
	"help.s.realm.t": "II. Cultivation & breakthroughs",
	"help.s.realm.b1": "Nine realms: Qi Refining, Foundation, Golden Core, Nascent Soul, Spirit Severing, Void Refining, Body Integration, Mahayana, Tribulation.",
	"help.s.realm.b2": "Each layer costs cultivation; past Qi Refining, breakthroughs can fail — failure costs nerve, never the realm.",
	"help.s.realm.b3": "Spirit root is rolled at birth: single roots cultivate faster, mixed roots pay more to break through; reincarnation rerolls.",
	"help.s.realm.b4": "Cultivation income: hut trickle, wander fortunes, rift loot, pills, seclusion.",
	"help.s.realm.b5": "Every realm raises production and combat power alike — realm is everything.",
	"help.s.action.t": "III. Four trials (shared cooldown)",
	"help.s.action.b1": "Wander: random fortunes — stones, herbs, fate events, occasional ambushes; slay the ambusher for loot.",
	"help.s.action.b2": "Seclusion: +60% cultivation, -15% mundane output — toggle before a hard breakthrough.",
	"help.s.action.b3": "Minor Rift: guaranteed cultivation plus a 30% rift-key drop.",
	"help.s.action.b4": "Greater Rift: spend a key per floor climbed; deeper pays more and drops artifacts.",
	"help.s.action.b5": "All four share one breath — after any trial, rest a moment.",
	"help.s.power.t": "IV. Combat power & artifacts",
	"help.s.power.b1": "Power comes from realm and artifacts — measure yourself before deep rift floors.",
	"help.s.power.b2": "Artifacts drop only in the Greater Rift; duplicates rank up, maxed ones fuse into relics.",
	"help.s.power.b3": "Losing a fight costs the key, never your life.",
	"help.s.eco.t": "V. Running your abode",
	"help.s.eco.b1": "Grain → wood → buildings: the Bonfire tab is the foundation of stone and cultivation income.",
	"help.s.eco.b2": "Spirit veins (Foundation): a permanent cultivation multiplier — buy early when minerals allow.",
	"help.s.eco.b3": "Sects (Foundation): promote as soon as your realm allows — huge cultivation boosts.",
	"help.s.eco.b4": "Pills: Qingxin purges heart demons, Zhuji adds breakthrough odds, Juqi boosts cultivation for a time.",
	"help.s.fate.t": "VI. Fates & choices",
	"help.s.fate.b1": "Wandering brings fate events — each choice is written into your chronicle.",
	"help.s.fate.b2": "Some choices open story arcs, others grant instant boons; follow your heart — few are strictly wrong.",
	"help.s.life.t": "VII. Lifespan & reincarnation",
	"help.s.life.b1": "Lifespan grows with realm; when it runs out, you pass away in meditation.",
	"help.s.life.b2": "Passing means reincarnation: cultivation is lost, karma remains — blessings for the next life.",
	"help.s.life.b3": "Rebirth rerolls your spirit root; karma buys permanent boons at the reincarnation screen.",
	"help.s.cloud.t": "VIII. Saves & cloud",
	"help.s.cloud.b1": "Autosaves locally every 30 seconds; export/import text saves under Options.",
	"help.s.cloud.b2": "Log in for cloud saves and shareable preview pages.",
	"help.s.cloud.b3": "The Jianghu leaderboard: optionally submit your realm to compare with fellow cultivators.",
	"help.s.faq.t": "IX. FAQ",
	"help.s.faq.b1": "Button greyed out? Check the resource column — red means missing; or you're resting between trials.",
	"help.s.faq.b2": "Breakthrough failed? Heart demon rises and suppresses the next attempt — wait it out or take a Qingxin pill.",
	"help.s.faq.b3": "Not sure what to do? Read Path Guidance — usually it's time to break through or run a rift.",
	"help.s.faq.b4": "Does progress persist after closing? Yes — local autosave; reopen and continue."
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
	//file ends with "\n}" — comma-splice the new block before the brace
	src = src.replace(/}(\s*)$/, "");
	if (!/,\s*$/.test(src)) { src = src.replace(/\s*$/, "") + ",\n"; }
	src += block + "\n}\n";
	fs.writeFileSync(p, src);
	JSON.parse(fs.readFileSync(p, "utf8"));	//paranoia: must stay valid
	console.log(file + ": +" + added + " keys");
}

appendKeys("res/i18n/en.json", EN);
appendKeys("res/i18n/zh.json", ZH);
appendKeys("res/i18n/crowdin/zh.json", ZH);
