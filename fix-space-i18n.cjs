// 星海/星球命名 + 收尾残留
const fs = require('fs');
const M = {
	// 星球名(中文修仙星域)
	'space.planet.cath.label': ['玄黄界', 'Xuanhuang'],
	'space.planet.moon.label': ['红月', 'Red Moon'],
	'space.planet.helios.label': ['大日', 'Helios'],
	'space.planet.charon.label': ['幽关', 'Charon'],
	'space.planet.dune.label': ['赤砂', 'Dune'],
	'space.planet.piscine.label': ['玄溟', 'Piscine'],
	'space.planet.yarn.label': ['绮罗', 'Yarn'],
	'space.planet.umbra.label': ['归墟', 'Umbra'],
	'space.planet.kairo.label': ['寒罗', 'Kairo'],
	'space.planet.furthestRing.label': ['界外之环', 'The Furthest Ring'],
	'space.planet.centaurusSystem.label': ['人马星域', 'Centaurus'],
	// 远征
	'space.moonMission.label': ['远征红月', 'Moon Mission'],
	'space.heliosMission.label': ['远征大日', 'Helios Mission'],
	'space.heliosMission.desc': ['大日——玄黄星域中心的亘古恒星', 'The eternal star at the heart of the realm'],
	'space.charonMission.label': ['远征幽关', 'Charon Mission'],
	'space.charonMission.desc': ['幽关是玄黄星域最边缘的荒凉小星,人称「死门」', 'A barren dwarf star at the realm\'s edge, called the Gate of Death'],
	'space.kairoMission.label': ['远征寒罗', 'Kairo Mission'],
	'space.kairoMission.desc': ['寒罗是玄黄星域尽头的一颗冰寒小星', 'A frozen dwarf at the realm\'s rim'],
	'space.duneMission.label': ['远征赤砂', 'Dune Mission'],
	'space.duneMission.desc': ['赤砂是一颗荒漠死星,遍布黄沙与火山岩', 'A lifeless world of sand and volcanic rock'],
	'space.piscineMission.label': ['远征玄溟', 'Piscine Mission'],
	'space.piscineMission.desc': ['玄溟是巨型水星,酸液海洋与瘴气笼罩', 'A giant water world of acid seas and miasma'],
	'space.yarnMission.label': ['远征绮罗', 'Yarn Mission'],
	'space.yarnMission.desc': ['绮罗拥有适宜天候、海洋与灵气氤氲的大气', 'A gentle world of seas and spirit-rich air'],
	'space.terminusMission.label': ['远征终焉', 'Terminus Mission'],
	'space.terminusMission.desc': ['终焉是玄黄星域远端的一颗巨型冰星', 'A massive ice giant at the realm\'s far rim'],
	'space.umbraMission.label': ['远征归墟', 'Umbra Mission'],
	'space.centaurusSystemMission.label': ['远征人马星域', 'Centaurus Mission'],
	'space.centaurusSystemMission.desc': ['人马星域是一片温暖而遥远的星域', 'A warm, distant starfield'],
	'space.furthestRingMission.label': ['远征界外之环', 'Furthest Ring Mission'],
	'space.furthestRingMission.desc': ['宇宙的尽头', 'The end of the universe'],
	'space.rorschachMission.label': ['远征归墟彗星', 'Rorschach Mission'],
	'space.rorschachMission.desc': ['归墟彗星是大日附近最大的彗星', 'The largest comet near Helios'],
	'space.mission.rorschach.complete.log.msg': ['归墟彗星无法登陆,但你的视野更远了', 'You cannot land on the comet, but you can see further now'],
	'space.orbitalLaunch.label': ['破空首航', 'Orbital Launch'],
	'space.ground.control.label': ['尘世总台', 'Ground Control'],
	'space.newplanet.log.msg': ['抵达新星辰!', 'You have reached a new star!'],
	// 星海建筑
	'space.planet.cath.spaceElevator.label': ['天梯', 'Sky Ladder'],
	'space.planet.cath.spaceStation.label': ['星宫', 'Star Palace'],
	'space.planet.cath.spaceStation.desc': ['部署一座星宫。每级提升感悟产出,并为 2 名星槎修士提供居所', 'Each palace boosts insight and houses 2 crew'],
	'space.planet.centaurusSystem.moltenCore.label': ['熔火之心', 'Molten Core'],
	'space.planet.centaurusSystem.moltenCore.desc': ['每级熔火之心使裂陆阵效能 +5%', 'Each core boosts tectonic rigs by 5%'],
	'space.planet.centaurusSystem.tectonic.label': ['裂陆阵', 'Tectonic Rig'],
	'space.planet.centaurusSystem.tectonic.desc': ['撕裂人马星域恒星附近的行星,收集熔岩能量', 'Tears planets near the star to harvest molten energy'],
	'space.planet.charon.entangler.label': ['纠缠阵', 'Entangler'],
	'space.planet.dune.hydrofracturer.label': ['破脉机', 'Veinbreaker'],
	'space.planet.dune.planetCracker.label': ['碎星钳', 'Starbreaker'],
	'space.planet.dune.planetCracker.desc': ['星槎「碎星」号可裂解整颗星辰', 'The ark Starbreaker can split entire worlds'],
	'space.planet.dune.spiceRefinery.label': ['灵香提炼', 'Incense Refinery'],
	'space.planet.dune.spiceRefinery.desc': ['自赤砂之中提炼珍稀灵香', 'Distills rare spirit incense from the sands'],
	'space.planet.helios.containmentChamber.label': ['封湮室', 'Containment Chamber'],
	'space.planet.helios.containmentChamber.desc': ['封湮室——湮尘存储上限 +100', 'Raises voiddust storage by 100'],
	'space.planet.helios.heatsink.label': ['玄冰阵', 'Frostveil Array'],
	'space.planet.helios.heatsink.desc': ['散热阵。每级使封湮室功率消耗 +1%,湮尘容量 +2%', 'Each array raises chamber power draw 1% but voiddust capacity 2%'],
	'space.planet.helios.sunforge.label': ['大日熔炉', 'Sunforge'],
	'space.planet.helios.sunforge.desc': ['借大日之焰熔炼万物。每级使基础金属类资源存储上限 +1%', 'Each forge raises basic metal storage by 1%'],
	'space.planet.helios.sunlifter.label': ['大日汲取', 'Sunlifter'],
	'space.planet.helios.sunlifter.desc': ['每年汲取一次湮尘,能源短缺时不工作', 'Harvests voiddust yearly; stalls under energy shortage'],
	'space.planet.kairo.spaceBeacon.label': ['引星灯', 'Star Beacon'],
	'space.planet.kairo.spaceBeacon.desc': ['湮尘驱动的星域灯台,用于研究与导航', 'Voiddust-powered beacon for research and navigation'],
	'space.planet.moon.moonBase.label': ['月宫', 'Moon Palace'],
	'space.planet.moon.moonBase.desc': ['于红月之上建立月宫', 'Establish a palace upon the Red Moon'],
	'space.planet.piscine.orbitalArray.label': ['天轨阵', 'Orbital Array'],
	'space.planet.piscine.orbitalArray.desc': ['所有星域建筑产能 +2%', 'All space buildings gain +2% output'],
	'space.planet.piscine.researchVessel.label': ['探星舟', 'Research Vessel'],
	'space.planet.piscine.researchVessel.desc': ['可远航的星域探查舟', 'A roaming vessel for starfield research'],
	'space.planet.terminus.cryostation.label': ['冰眠站', 'Cryostation'],
	'space.planet.terminus.cryostation.desc': ['庞大的复合储藏阵', 'A vast composite storage facility'],
	'space.planet.umbra.hrHarvester.label': ['归墟收割机', 'Void Harvester'],
	'space.planet.yarn.hydroponics.label': ['灵圃栽培', 'Spirit Gardens'],
	'space.planet.yarn.hydroponics.desc': ['尖端机关术驱动的灵圃栽培系统。灵谷存储上限 +10%,产量 +2.5%', 'Automated spirit gardens. Grain cap +10%, output +2.5%'],
	'space.planet.yarn.terraformingStation.label': ['改天换地台', 'Terraforming Station'],
	'space.planet.yarn.terraformingStation.desc': ['以湮尘之力融开绮罗冰层,释放灵气于大气', 'Voiddust melts the ice, freeing spirit into the air'],
	// 收尾残留
	'science.archeology.desc': ['探古学——考究玄黄界岩骨地脉变迁,利于采矿', 'The lore of ancient strata — aids mining'],
	'science.exogeology.desc': ['域外堪舆——探究星域金属与矿藏之学', 'The study of metals and minerals beyond the realm'],
	'science.terraformation.label': ['改天换地', 'Terraforming'],
	'science.terraformation.desc': ['改天换地——以湮尘之力改易玄黄星域诸星天候', 'Reshaping the heavens of the starfield with voiddust'],
	'prestige.willenfluff.label': ['维伦道夫的灵麒像', 'Qilin of Willendorf'],
	'religion.ru.templars.desc': ['神殿少量提升灵力上限', 'Temples slightly increase spirit power cap'],
};
for (const p of ['res/i18n/zh.json', 'res/i18n/crowdin/zh.json', 'res/i18n/en.json']) {
	const j = JSON.parse(fs.readFileSync(p, 'utf8'));
	const isEn = p.endsWith('en.json') && !p.includes('crowdin');
	let c = 0;
	for (const [k, [z, e]] of Object.entries(M)) {
		const val = isEn ? e : z;
		if (val === null || val === undefined) continue;
		if (j[k] !== val) { j[k] = val; c++; }
	}
	fs.writeFileSync(p, JSON.stringify(j, null, '\t') + '\n');
	console.log(p, 'changed:', c);
}
