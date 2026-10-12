// en.json 仙缘键专名替换:与 zh 原创剧情对齐(en 为回退 locale,做名词级对齐)
const fs = require('fs');
// 顺序敏感:长串在前
const R = [
	['Nangong Wan', 'Leng Ningshuang'], ['Nangong', 'Ningshuang'],
	['Zhang Tie', 'A-Yan'], ['Doctor Mo', 'Doctor Wen'], ['Mo Juren', 'Wen Jiuzhen'],
	['Shenshou Valley', 'Rejuvenation Hollow'], ['Shenshou', 'Rejuvenation'],
	['Seven Mysteries Sect', 'Greenpeak Sect'], ['Seven Mysteries', 'Greenpeak'],
	['Li Feiyu', 'Yue Jinglan'],
	['Sage Jinguang', 'the Bloodglyph Sage'], ['Jinguang', 'Bloodglyph'],
	['golden light', 'blood-red light'], ['Goldenlight', 'Bloodglyph'],
	['Yellow Maple Valley', 'Mount Cangwu'], ['Yellow Maple', 'Cangwu'],
	['Azure Essence Sword Art', 'Verdantwood Sword Art'], ['Azure Essence', 'Verdantwood'],
	['Qing Yuanzi', 'the Verdantwood Patriarch'],
	['Tainan', 'White Marsh'],
	['the Blood-Forbidden Land', 'the Burial-Soul Vale'], ['Blood-Forbidden Land', 'Burial-Soul Vale'], ['Blood Forbidden Land', 'Burial-Soul Vale'], ['Blood-Forbidden', 'Burial-Soul'],
	['Dark Flood Pond', 'Darkflood Mere'], ['Ink-Flood', 'Darkflood'], ['Ink Flood', 'Darkflood'], ['flood dragon', 'flood-drake'], ['Flood Dragon', 'Flood-Drake'],
	['Yanyue Sect', 'Moonreach Palace'], ['Yanyue', 'Moonreach'], ['Masked Moon', 'Moonreach'],
	['Chaotic Star Sea', 'Fallen Star Sea'], ['Scattered Star Sea', 'Fallen Star Sea'], ['Star Sea', 'Fallen Star Sea'],
	['Heaven South', 'Southwilds'], ['Tiannan', 'Southwilds'],
	['Chen Qiaoqian', 'Gu Qingwu'],
	['Great Yan Art', 'Thousandfold Art'], ['Art of Great Yan', 'Thousandfold Art'], ['Great Yan', 'Thousandfold'], ['Dayan', 'Qianji'],
	['Gold-Devouring Beetles', 'Goldbane Grubs'], ['Gold-Devouring', 'Goldbane'],
	['Weeping Soul Beast', 'Soulgorger'], ['Weeping Soul', 'Soulgorger'], ['Soul-Weeping', 'Soulgorging'],
	['Silvermoon', 'Frostmoon'],
	['Yuanyao', 'Shen Qingheng'],
	['Qu Hun', 'Iron Raiment'], ['Crooked Soul', 'Iron Raiment'],
	['Xuan Gu', 'Netherbone'],
	['Heavenvoid Palace', 'Fallen-Immortal Vault'], ['Void Heaven Palace', 'Fallen-Immortal Vault'], ['Void Heaven', 'Fallen-Immortal'],
	['Azure Frostflame', 'Frostsoul Flame'], ['Qianlan', 'Frostsoul'],
	['Heaven-Mending Pill', 'Marrowmend Pill'], ['Sky-Mending Pill', 'Marrowmend Pill'],
	['Wind-Thunder Wings', 'Stormwind Pinions'], ['Wind-Thunder', 'Stormwind'],
	['Daoist Crab', 'Old Bronze-Shell'], ['Crab Daoist', 'Old Bronze-Shell'], ['gold crab-puppet', 'gilded bronze-shell puppet'],
	['Mystic Heaven Fruit', 'Primal Dao Fruit'], ['Profound Heaven Fruit', 'Primal Dao Fruit'],
	['golden thunder bamboo', 'violet thunder bamboo'], ['Gold-Thunder Bamboo', 'Violet Thunder Bamboo'], ['gold thunder bamboo', 'violet thunder bamboo'],
	['Bamboo Cloudswarm Swords', 'Violetthunder Bamboo Swords'], ['Cloudswarm', 'Violetthunder'],
	['Heaven Palm Bottle', 'Dewgather Vial'],
	['Grand Possession Art', 'Form-Seizing Codex'], ['Possession Art', 'Form-Seizing Codex'],
	['Eternal Spring Art', 'Nourishing Sutra'], ['Eternal Spring', 'Nourishing Sutra'], ['Evergreen Art', 'Nourishing Sutra'],
	['the Spirit Realm', 'the Upper Realm'], ['Spirit Realm', 'Upper Realm'],
	['Feiling clan', 'Featherfolk warrens'], ['Feiling', 'Featherfolk'],
	['Nine-Curve Spirit Ginseng', 'Dragonwhisker Ginseng'], ['Nine-Curve', 'Dragonwhisker'],
	['Six Demonic Sects', 'Seven Banes Sect'], ['six demonic sects', 'seven banes sects'],
	['Han boy', 'boy'], ['Han kid', 'kid'],
];
const p = 'res/i18n/en.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
let touched = 0;
for (const k of Object.keys(j)) {
	if (!/^cultivation\.(fate|dream|msg)\./.test(k)) continue;
	let v = String(j[k]), nv = v;
	for (const [a, b] of R) nv = nv.split(a).join(b);
	if (nv !== v) { j[k] = nv; touched++; }
}
// zh 对齐的 msg 键(en 直译)
const M = {
	'cultivation.msg.mojuren.1': 'The sealed wisp of Doctor Wen whispers: "Boy, your foundation is full of holes." (heart demon grows)',
	'cultivation.msg.mojuren.2': 'The sealed wisp of Doctor Wen sneers: "This is all you have, and you seek eternity?" (heart demon grows)',
	'cultivation.msg.mojuren.3': 'The sealed wisp of Doctor Wen sighs: "If I had taken you that night..." (heart demon grows)',
	'cultivation.msg.yuanyao.1': 'A message-jade arrives from Shen Qingheng: the Fallen Star Sea is calm, and her senior sister\'s soul has firmed again.',
	'cultivation.msg.yuanyao.2': 'A letter arrives across the seas: Shen Qingheng found some fortune and keeps an eye on the Fallen Star Sea for you.',
	'cultivation.msg.xugu.gift': 'Netherbone sends a relic: "Share and share alike, little friend." (relic +{0})',
	'cultivation.msg.xugu.skim': 'Some of your spirit stones are gone — a note in Netherbone\'s hand: "Borrowed, will repay." (spirit stones -{0})',
	'cultivation.msg.demon.warn': 'The heart demon swells and already presses on your breakthrough odds — a Mind-Clearing Pill cleanses, and Leng Ningshuang\'s bond eases it too.',
};
for (const [k, v] of Object.entries(M)) { if (j[k] !== v) { j[k] = v; touched++; } }
fs.writeFileSync(p, JSON.stringify(j, null, '\t') + '\n');
console.log('en changed:', touched);
// 复核残留
const en = JSON.parse(fs.readFileSync(p, 'utf8'));
const bad = /Nangong|Zhang Tie|Doctor Mo|Shenshou|Seven Mysteries|Li Feiyu|Jinguang|Yellow Maple|Azure Essence|Qing Yuanzi|Tainan|Blood-Forbidden|Masked Moon|Yanyue|Chaotic Star|Heaven South|Chen Qiaoqian|Dayan|Gold-Devouring|Weeping Soul|Silvermoon|Yuanyao|Qu Hun|Xuan Gu|Heavenvoid|Void Heaven|Azure Frost|Heaven-Mending|Wind-Thunder|Crab|Mystic Heaven|Cloudswarm|Heaven Palm|Han Li/i;
let left = [];
Object.keys(en).forEach(k => {
	if (/^cultivation\.(fate|dream|msg)\./.test(k) && bad.test(String(en[k]))) left.push(k + ' = ' + String(en[k]).slice(0, 80));
});
console.log('en residual:', left.length); left.forEach(l => console.log(' ', l));
